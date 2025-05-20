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
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { paymentIntentId, paymentStatus, paymentDetails } = body;

        // 1. Validate and sanitize incoming data
        if (!paymentIntentId || !paymentStatus || !body.rooms || !Array.isArray(body.rooms)) {
            return NextResponse.json(
                { error: 'Missing or invalid required payment/booking information' },
                { status: 400 }
            );
        }

        // 2. Fix all dates in the rooms array before saving
        const sanitizedRooms = body.rooms.map((room: any) => {
            if (!room.dates || !Array.isArray(room.dates)) {
                console.error('Invalid room dates:', room);
                throw new Error('Invalid room dates format');
            }
            return {
                ...room,
                dates: room.dates.map((d: any) => {
                    let dateStr = d.date || d;
                    if (!dateStr) {
                        console.error('Missing date:', d);
                        throw new Error('Missing date in room booking');
                    }
                    
                    // Handle string dates
                    if (typeof dateStr === 'string') {
                        // If already in YYYY-MM-DD format, use as is
                        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            return { ...d, date: dateStr };
                        }
                        // Try to parse and format
                        const dt = new Date(dateStr);
                        if (isNaN(dt.getTime())) {
                            console.error('Invalid date string:', dateStr);
                            throw new Error('Invalid date format');
                        }
                        return { ...d, date: dt.toISOString().split('T')[0] };
                    }
                    
                    // Handle Date objects
                    if (dateStr instanceof Date) {
                        return { ...d, date: dateStr.toISOString().split('T')[0] };
                    }
                    
                    console.error('Unsupported date format:', dateStr);
                    throw new Error('Unsupported date format');
                })
            };
        });

        // 3. Only update trusted fields
        let booking;
        try {
            booking = await Booking.findOneAndUpdate(
                { paymentIntentId },
                {
                    $set: {
                        userId: session.user.id,
                        rooms: sanitizedRooms,
                        bookingType: body.bookingType,
                        totalAmount: body.totalAmount,
                        status: paymentStatus === 'succeeded' ? 'confirmed' : 'pending',
                        paymentStatus,
                        paymentDetails: {
                            ...paymentDetails,
                            lastUpdated: new Date()
                        },
                        updatedAt: new Date()
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );
            console.log('Booking found and updated:', booking ? booking._id : null);
        } catch (err) {
            console.error('Error finding/updating booking:', err);
            return NextResponse.json({ error: 'Failed to update booking', details: err instanceof Error ? err.message : err }, { status: 500 });
        }

        if (!booking) {
            console.error('Booking not found for paymentIntentId:', paymentIntentId);
            return NextResponse.json({ error: 'Booking not found for paymentIntentId' }, { status: 404 });
        }

        console.log('Booking status updated:', {
            bookingId: booking._id,
            status: booking.status,
            paymentStatus: booking.paymentStatus
        });

        // Get user details and handle verification
        let user;
        try {
            user = await User.findById(session.user.id);
            console.log('User found:', user ? user._id : null);
        } catch (err) {
            console.error('Error finding user:', err);
            throw err;
        }
        if (!user) {
            console.error('User not found for id:', session.user.id);
            throw new Error('User not found');
        }

        // Debug log before membership update
        console.log('DEBUG: paymentStatus:', paymentStatus, 'user.isMembershipActive:', user.isMembershipActive);
        // Always update user membership status if payment succeeded and user is not already activated
        if (paymentStatus === 'succeeded' && !user.isMembershipActive) {
            try {
                // Update user membership status
                await User.findByIdAndUpdate(
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

                // Update the user object for email sending
                user.isMembershipActive = true;
                user.membershipActivatedAt = new Date();
                
                console.log('User membership status activated after first payment:', {
                    userId: user._id,
                    isMembershipActive: true,
                    membershipActivatedAt: new Date()
                });
            } catch (err) {
                console.error('Failed to update user membership status:', err);
            }
        }

        // Format dates for email
        const formattedRooms = booking.rooms.map((room: any) => {
            // Ensure dates array exists and is properly formatted
            const formattedDates = room.dates.map((date: any) => {
                // Handle both string dates and date objects
                const dateStr = typeof date === 'object' ? date.date : date;
                if (!dateStr) {
                    console.error('Invalid date format:', date);
                    return null;
                }

                // Try to parse and format the date
                try {
                    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        return dateStr;
                    }
                    const dt = new Date(dateStr);
                    if (isNaN(dt.getTime())) {
                        console.error('Invalid date:', dateStr);
                        return null;
                    }
                    return dt.toISOString().split('T')[0];
                } catch (error) {
                    console.error('Error formatting date:', error);
                    return null;
                }
            }).filter(Boolean); // Remove any null values

            return {
                name: room.name,
                timeSlot: room.timeSlot,
                dates: formattedDates
            };
        });

        // Send confirmation email if payment succeeded
        if (paymentStatus === 'succeeded' && user.preferences?.emailNotifications) {
            try {
                const { subject, html } = getBookingConfirmationEmail({
                    customerName: `${user.firstName} ${user.lastName}`,
                    bookingId: booking._id,
                    bookingType: booking.bookingType,
                    totalAmount: paymentDetails?.amount || 0,
                    rooms: formattedRooms
                });

                await sendEmail({
                    to: user.email,
                    subject,
                    html
                });

                console.log('Booking confirmation email sent successfully');
            } catch (error) {
                console.error('Failed to send booking confirmation email:', error);
                // Don't throw error here as booking is still successful
            }
        }

        // Ensure all booking room dates are stored as ISO strings (YYYY-MM-DD)
        let datesFixed = false;
        if (booking.rooms && Array.isArray(booking.rooms)) {
            booking.rooms.forEach((room: any) => {
                if (room.dates && Array.isArray(room.dates)) {
                    room.dates = room.dates.map((d: any) => {
                        let dateStr = d.date || d;
                        if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            return { ...d, date: dateStr };
                        }
                        const dt = new Date(dateStr);
                        datesFixed = true;
                        return { ...d, date: dt.toISOString().split('T')[0] };
                    });
                }
            });
            if (datesFixed) {
                await booking.save();
                console.log('Fixed and saved booking dates as ISO strings.');
            }
        }

        // Create a booking summary document
        await BookingSummary.create({
            bookingId: booking._id.toString(),
            userId: session.user.id,
            totalAmount: booking.totalAmount,
            status: booking.status,
            createdAt: booking.createdAt
        });

        return NextResponse.json({
            message: 'Booking processed successfully',
            booking,
            status: booking.status
        });
    } catch (error) {
        console.error('Error confirming booking:', error);
        return NextResponse.json(
            {
                error: 'Failed to confirm booking',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 