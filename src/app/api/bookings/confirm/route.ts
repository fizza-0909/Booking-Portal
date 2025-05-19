import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { paymentIntentId, paymentStatus, paymentDetails } = body;

        if (!paymentIntentId || !paymentStatus) {
            return NextResponse.json(
                { error: 'Missing required payment information' },
                { status: 400 }
            );
        }

        console.log('Processing booking confirmation:', {
            userId: session.user.id,
            paymentIntentId,
            paymentStatus
        });

        // Use findOneAndUpdate with upsert for atomic operation
        const booking = await Booking.findOneAndUpdate(
            { paymentIntentId },
            {
                $set: {
                    ...body,
                    userId: session.user.id,
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
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        if (!booking) {
            throw new Error('Failed to create/update booking');
        }

        console.log('Booking status updated:', {
            bookingId: booking._id,
            status: booking.status,
            paymentStatus: booking.paymentStatus
        });

        // Get user details and handle verification
        const user = await User.findById(session.user.id);
        if (!user) {
            throw new Error('User not found');
        }

        // Update user verification status if payment succeeded
        if (paymentStatus === 'succeeded' && !user.isVerified) {
            await User.findByIdAndUpdate(
                user._id,
                {
                    $set: {
                        isVerified: true,
                        verifiedAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                { new: true }
            );
            console.log('Updated user verification status');
        }

        // Send confirmation email if payment succeeded
        if (paymentStatus === 'succeeded' && user.preferences?.emailNotifications) {
            try {
                const { subject, html } = getBookingConfirmationEmail({
                    ...body,
                    customerName: `${user.firstName} ${user.lastName}`,
                    bookingId: booking._id,
                    amount: paymentDetails?.amount
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