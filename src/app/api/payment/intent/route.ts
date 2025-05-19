import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import User from '@/models/User';

interface BookingDate {
    date: string;
    startTime: string;
    endTime: string;
}

interface BookingRoom {
    id: number;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: string[];
}

interface BookingData {
    rooms: BookingRoom[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
}

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
});

// Helper function to format date string
const formatDateString = (dateStr: string) => {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error('Invalid date components');
        }
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        throw new Error('Invalid date format');
    }
};

export async function POST(req: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { amount, bookingData } = await req.json();
        console.log('Received payment intent request:', { amount, bookingData });

        // Validate amount
        if (!amount || amount <= 0) {
            console.error('Invalid amount:', amount);
            return NextResponse.json(
                { error: 'Please provide a valid payment amount' },
                { status: 400 }
            );
        }

        // Validate booking data
        if (!bookingData || !bookingData.rooms || bookingData.rooms.length === 0) {
            console.error('Invalid booking data:', bookingData);
            return NextResponse.json(
                { error: 'Please select at least one room to book' },
                { status: 400 }
            );
        }

        await dbConnect();
        console.log('Connected to database');

        // Get user details and check/create Stripe customer
        const user = await User.findById(session.user.id);
        if (!user) {
            throw new Error('User not found');
        }

        let stripeCustomerId = user.stripeCustomerId;

        // If user doesn't have a Stripe customer ID, create one
        if (!stripeCustomerId) {
            console.log('Creating new Stripe customer for user');
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                metadata: {
                    userId: user._id.toString()
                }
            });
            stripeCustomerId = customer.id;

            // Save Stripe customer ID to user
            await User.findByIdAndUpdate(user._id, {
                stripeCustomerId: customer.id
            });
            console.log('Saved Stripe customer ID to user');
        }

        // Check for existing incomplete payment intents
        const existingPaymentIntents = await stripe.paymentIntents.list({
            customer: stripeCustomerId,
            limit: 5
        });

        const matchingIntent = existingPaymentIntents.data.find(intent =>
            intent.amount === Math.round(amount) &&
            intent.status === 'requires_payment_method' &&
            Date.now() - intent.created * 1000 < 3600000 // Less than 1 hour old
        );

        let paymentIntent;
        if (matchingIntent) {
            console.log('Found existing payment intent:', matchingIntent.id);
            paymentIntent = matchingIntent;
        } else {
            // Create a new PaymentIntent
            paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount),
                currency: 'usd',
                customer: stripeCustomerId,
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    userId: session.user.id
                }
            });
            console.log('Created new payment intent:', {
                id: paymentIntent.id,
                amount: paymentIntent.amount
            });
        }

        // Check for existing pending booking
        const existingBooking = await Booking.findOne({
            userId: session.user.id,
            totalAmount: amount / 100,
            status: 'pending',
            createdAt: { $gt: new Date(Date.now() - 3600000) } // Less than 1 hour old
        });

        let booking;
        if (existingBooking) {
            console.log('Found existing booking:', existingBooking._id);
            booking = existingBooking;
        } else {
            // Create new booking
            booking = await Booking.create({
                userId: session.user.id,
                rooms: bookingData.rooms.map(room => ({
                    roomId: room.id.toString(),  // Convert to string as required
                    name: `Room ${room.id}`,
                    timeSlot: room.timeSlot,
                    dates: room.dates.map(date => {
                        // Get time slots based on booking type
                        const timeSlots = (() => {
                            switch (room.timeSlot) {
                                case 'morning':
                                    return { startTime: '08:00', endTime: '13:00' };
                                case 'evening':
                                    return { startTime: '14:00', endTime: '19:00' };
                                case 'full':
                                default:
                                    return { startTime: '08:00', endTime: '19:00' };
                            }
                        })();

                        // Format the date string properly
                        const formattedDate = formatDateString(date);

                        return {
                            date: formattedDate,
                            startTime: timeSlots.startTime,
                            endTime: timeSlots.endTime
                        };
                    })
                })),
                bookingType: bookingData.bookingType,
                totalAmount: amount / 100,
                status: 'pending',
                paymentStatus: 'pending',
                paymentIntentId: paymentIntent.id,
                stripeCustomerId: stripeCustomerId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Created new booking:', {
                id: booking._id,
                rooms: booking.rooms.length,
                amount: booking.totalAmount
            });
        }

        // Ensure payment intent has the booking ID
        if (!paymentIntent.metadata.bookingIds) {
            await stripe.paymentIntents.update(paymentIntent.id, {
                metadata: {
                    ...paymentIntent.metadata,
                    bookingIds: booking._id.toString()
                }
            });
            console.log('Updated payment intent with booking ID');
        }

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            bookingIds: [booking._id.toString()]
        });
    } catch (error) {
        console.error('Payment intent creation failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
            { status: 500 }
        );
    }
} 