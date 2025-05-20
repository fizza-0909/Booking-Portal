import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

interface Room {
    id: number;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: string[];
}

interface BookingData {
    rooms: Room[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
}

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    typescript: true,
});

export async function POST(req: Request) {
    try {
        console.log('Starting payment intent creation...');

        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.error('Payment intent creation failed: No authenticated user');
            return NextResponse.json(
                { error: 'Please log in to continue with payment' },
                { status: 401 }
            );
        }

        let requestData;
        try {
            const rawData = await req.text();
            console.log('Raw request data:', rawData);
            requestData = JSON.parse(rawData);
            console.log('Parsed request data:', requestData);
        } catch (e) {
            console.error('Payment intent creation failed: Invalid JSON data', e);
            return NextResponse.json(
                { error: 'Invalid request format' },
                { status: 400 }
            );
        }

        const { amount, bookingData } = requestData;

        // Validate amount
        if (!amount || amount <= 0 || !Number.isInteger(amount)) {
            console.error('Payment intent creation failed: Invalid amount', { amount });
            return NextResponse.json(
                { error: 'Please provide a valid payment amount' },
                { status: 400 }
            );
        }

        // Validate booking data
        if (!bookingData?.rooms || !Array.isArray(bookingData.rooms) || bookingData.rooms.length === 0) {
            console.error('Payment intent creation failed: Invalid booking data', { bookingData });
            return NextResponse.json(
                { error: 'Please select at least one room to book' },
                { status: 400 }
            );
        }

        // Validate dates in rooms
        const invalidRooms = bookingData.rooms.filter((room: Room) => !room.dates || !Array.isArray(room.dates) || room.dates.length === 0);
        if (invalidRooms.length > 0) {
            console.error('Payment intent creation failed: Rooms with invalid dates', { invalidRooms });
            return NextResponse.json(
                { error: 'Some rooms have invalid or missing dates' },
                { status: 400 }
            );
        }

        // Connect to database
        console.log('Connecting to database...');
        const { db } = await connectToDatabase();

        try {
            // Check for existing bookings
            const existingBookings = await Promise.all(
                bookingData.rooms.map(async (room: Room) => {
                    const bookings = await db.collection('bookings').find({
                        roomId: room.id.toString(),
                        $or: room.dates.map(date => ({
                            date: date,
                            timeSlot: room.timeSlot,
                            status: { $in: ['pending', 'confirmed'] }
                        }))
                    }).toArray();

                    if (bookings.length > 0) {
                        console.log('Found conflicting bookings:', {
                            roomId: room.id,
                            timeSlot: room.timeSlot,
                            dates: room.dates,
                            conflicts: bookings.map(b => ({
                                date: b.date,
                                timeSlot: b.timeSlot,
                                status: b.status
                            }))
                        });
                    }
                    return bookings;
                })
            );

            // Check if there are any conflicts
            const conflicts = existingBookings.flat();
            if (conflicts.length > 0) {
                const conflictDetails = conflicts.map(conflict => ({
                    roomId: conflict.roomId,
                    date: conflict.date,
                    timeSlot: conflict.timeSlot,
                    status: conflict.status
                }));

                console.log('Booking conflicts found:', conflictDetails);
                return NextResponse.json(
                    {
                        error: 'Booking conflict',
                        message: 'Some of these rooms are already booked for the selected dates',
                        conflicts: conflictDetails
                    },
                    { status: 409 }
                );
            }

            // Calculate amount per booking
            const totalBookings = bookingData.rooms.reduce((acc: number, room: Room) => acc + room.dates.length, 0);
            const amountPerBooking = Math.round((amount / totalBookings) / 100); // Convert to dollars and split evenly

            console.log('Creating bookings with amount:', { totalBookings, amountPerBooking, totalAmount: amount });

            // Create bookings
            const bookingPromises = bookingData.rooms.map((room: Room) =>
                Promise.all(room.dates.map(date =>
                    db.collection('bookings').insertOne({
                        userId: session.user.id,
                        roomId: room.id.toString(),
                        date,
                        timeSlot: room.timeSlot,
                        status: 'pending',
                        totalAmount: amountPerBooking,
                        paymentDetails: {
                            status: 'pending',
                            createdAt: new Date()
                        },
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                ))
            );

            const bookingResultsNested = await Promise.all(bookingPromises);
            const bookingResults = bookingResultsNested.flat();
            const bookingIds = bookingResults.map(result => result.insertedId.toString());

            console.log('Successfully created pending bookings', {
                bookingIds,
                count: bookingIds.length,
                expectedCount: totalBookings
            });

            // Create Stripe payment intent
            console.log('Creating Stripe payment intent...', { amount });
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userId: session.user.id,
                    bookingIds: bookingIds.join(','),
                    bookingType: bookingData.bookingType
                }
            });

            console.log('Payment intent created:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount,
                status: paymentIntent.status
            });

            // Update bookings with payment intent ID
            await db.collection('bookings').updateMany(
                { _id: { $in: bookingResults.map(result => result.insertedId) } },
                {
                    $set: {
                        'paymentDetails.paymentIntentId': paymentIntent.id,
                        updatedAt: new Date()
                    }
                }
            );

            return NextResponse.json({
                clientSecret: paymentIntent.client_secret,
                bookingIds
            });
        } catch (dbError) {
            console.error('Database operation failed:', dbError);
            return NextResponse.json(
                { error: 'Failed to process booking. Please try again.' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Payment intent creation failed:', error);
        if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
                { error: `Payment service error: ${error.message}` },
                { status: error.statusCode || 500 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to create payment intent. Please try again.' },
            { status: 500 }
        );
    }
} 