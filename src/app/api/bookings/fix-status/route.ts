import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { paymentIntentId } = body;

        if (!paymentIntentId) {
            return NextResponse.json(
                { error: 'Missing payment intent ID' },
                { status: 400 }
            );
        }

        console.log('Fixing booking status for payment intent:', paymentIntentId);

        // Find the booking first to check its current state
        const existingBooking = await Booking.findOne({ paymentIntentId });

        if (!existingBooking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Only update if the status is inconsistent
        if (existingBooking.paymentStatus === 'succeeded' && existingBooking.status !== 'confirmed') {
            const booking = await Booking.findOneAndUpdate(
                { paymentIntentId },
                {
                    $set: {
                        status: 'confirmed',
                        paymentStatus: 'succeeded',
                        paymentDetails: {
                            ...existingBooking.paymentDetails,
                            status: 'succeeded',
                            fixedAt: new Date(),
                            previousStatus: existingBooking.status
                        },
                        updatedAt: new Date()
                    }
                },
                { new: true, runValidators: true }
            );

            console.log('Successfully fixed booking status:', {
                bookingId: booking._id,
                previousStatus: existingBooking.status,
                newStatus: booking.status
            });

            // Update user verification if needed
            const user = await User.findById(session.user.id);
            if (user && !user.isVerified) {
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
                console.log('Updated user verification status during fix');
            }

            return NextResponse.json({
                message: 'Booking status fixed successfully',
                booking,
                statusFixed: true
            });
        }

        // If status is already consistent, return success without changes
        return NextResponse.json({
            message: 'Booking status is already correct',
            booking: existingBooking,
            statusFixed: false
        });

    } catch (error) {
        console.error('Error fixing booking status:', error);
        return NextResponse.json(
            {
                error: 'Failed to fix booking status',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 