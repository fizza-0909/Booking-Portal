import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email';
import BookingSummary from '@/models/BookingSummary';

export async function POST(req: Request) {
    try {
        console.log('Starting booking confirmation process...');
        
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            console.error('No session or user ID found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Session user:', {
            userId: session.user.id,
            email: session.user.email
        });

        const body = await req.json();
        const { paymentIntentId, paymentStatus, rooms, bookingType, totalAmount } = body;

        // Add more detailed validation
        if (!paymentIntentId) {
            console.error('Missing paymentIntentId');
            return NextResponse.json({ error: 'Payment Intent ID is required' }, { status: 400 });
        }

        if (!paymentStatus) {
            console.error('Missing paymentStatus');
            return NextResponse.json({ error: 'Payment status is required' }, { status: 400 });
        }

        if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
            console.error('Invalid or empty rooms array:', rooms);
            return NextResponse.json({ error: 'Valid rooms array is required' }, { status: 400 });
        }

        // Validate each room has required properties
        for (const room of rooms) {
            if (!room.id || !room.name || !room.timeSlot || !room.dates || !Array.isArray(room.dates)) {
                console.error('Invalid room data:', room);
                return NextResponse.json({ 
                    error: 'Each room must have id, name, timeSlot, and dates array' 
                }, { status: 400 });
            }
        }

        if (!bookingType || !['daily', 'monthly'].includes(bookingType)) {
            console.error('Invalid bookingType:', bookingType);
            return NextResponse.json({ error: 'Valid booking type is required' }, { status: 400 });
        }

        if (typeof totalAmount !== 'number' || totalAmount < 0) {
            console.error('Invalid totalAmount:', totalAmount);
            return NextResponse.json({ error: 'Valid total amount is required' }, { status: 400 });
        }

        await dbConnect();
        console.log('Connected to database');

        // Get user details
        const user = await User.findById(session.user.id);
        if (!user) {
            console.error('User not found:', session.user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('Current user status:', {
            userId: user._id,
            isMembershipActive: user.isMembershipActive
        });

        // Process room data
        const sanitizedRooms = rooms.map(room => {
            try {
                // Get time slots based on booking type
                const getTimeSlotHours = (timeSlot: string) => {
                    switch (timeSlot) {
                        case 'morning':
                            return { startTime: '08:00', endTime: '12:00' };
                        case 'evening':
                            return { startTime: '13:00', endTime: '17:00' };
                        case 'full':
                            return { startTime: '08:00', endTime: '17:00' };
                        default:
                            throw new Error(`Invalid time slot: ${timeSlot}`);
                    }
                };

                if (!room.id || typeof room.id !== 'string') {
                    throw new Error('Invalid room ID');
                }

                const timeSlotHours = getTimeSlotHours(room.timeSlot);

                // Validate dates array
                if (!Array.isArray(room.dates) || room.dates.length === 0) {
                    throw new Error('Room dates must be a non-empty array');
                }

                const processedDates = room.dates.map(date => {
                    // Handle string dates
                    const dateStr = typeof date === 'string' ? date : date?.date;
                    if (!dateStr || typeof dateStr !== 'string') {
                        throw new Error('Invalid date format');
                    }

                    // Validate date string
                    const dateObj = new Date(dateStr);
                    if (isNaN(dateObj.getTime())) {
                        throw new Error(`Invalid date: ${dateStr}`);
                    }

                    // Ensure date is in YYYY-MM-DD format
                    const formattedDate = dateObj.toISOString().split('T')[0];

                    return {
                        date: formattedDate,
                        startTime: timeSlotHours.startTime,
                        endTime: timeSlotHours.endTime
                    };
                });

                return {
                    roomId: room.id.toString(),
                    name: room.name || `Room ${room.id}`,
                    timeSlot: room.timeSlot,
                    dates: processedDates
                };
            } catch (error) {
                console.error('Error processing room data:', error);
                throw new Error(`Error processing room ${room.id}: ${error.message}`);
            }
        });

        console.log('Processed room data:', sanitizedRooms);

        // If payment succeeded, update user membership status
        if (paymentStatus === 'succeeded' && !user.isMembershipActive) {
            console.log('Updating user membership status...');
            const updatedUser = await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        isMembershipActive: true,
                        membershipActivatedAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );

            console.log('Updated user membership status:', {
                userId: updatedUser._id,
                isMembershipActive: updatedUser.isMembershipActive,
                membershipActivatedAt: updatedUser.membershipActivatedAt
            });
        }

        // Update or create booking
        const booking = await Booking.findOneAndUpdate(
            { paymentIntentId },
            {
                $set: {
                    userId: session.user.id,
                    rooms: sanitizedRooms,
                    bookingType: bookingType || 'daily',
                    totalAmount: totalAmount || 0,
                    status: paymentStatus === 'succeeded' ? 'confirmed' : 'pending',
                    paymentStatus,
                    paymentDetails: {
                        status: paymentStatus,
                        updatedAt: new Date()
                    },
                    isMembershipActive: user.isMembershipActive,
                    updatedAt: new Date()
                }
            },
            { new: true, upsert: true }
        );

        console.log('Updated booking:', {
            bookingId: booking._id,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            isMembershipActive: booking.isMembershipActive,
            rooms: booking.rooms
        });

        // Send confirmation email if payment succeeded
        if (paymentStatus === 'succeeded' && user.preferences?.emailNotifications) {
            try {
                const { subject, html } = getBookingConfirmationEmail({
                    customerName: `${user.firstName} ${user.lastName}`,
                    bookingId: booking._id,
                    bookingType: booking.bookingType,
                    totalAmount: booking.totalAmount,
                    rooms: sanitizedRooms
                });

                await sendEmail({
                    to: user.email,
                    subject,
                    html
                });

                console.log('Booking confirmation email sent successfully');
            } catch (error) {
                console.error('Failed to send booking confirmation email:', error);
            }
        }

        return NextResponse.json({
            message: 'Booking confirmed successfully',
            booking,
            membershipStatus: {
                isMembershipActive: user.isMembershipActive,
                activatedAt: user.membershipActivatedAt
            }
        });
    } catch (error) {
        console.error('Error confirming booking:', error);
        return NextResponse.json(
            { error: 'Failed to confirm booking' },
            { status: 500 }
        );
    }
} 