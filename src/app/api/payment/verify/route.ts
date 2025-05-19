import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import User from '@/models/User';
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { clientSecret } = body;

        if (!clientSecret) {
            return NextResponse.json(
                { error: 'Payment client secret is required' },
                { status: 400 }
            );
        }

        // Retrieve payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(clientSecret.split('_secret_')[0]);
        console.log('Retrieved payment intent:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            metadata: paymentIntent.metadata
        });

        await dbConnect();
        console.log('Connected to database');

        // Get the booking using metadata from payment intent
        const bookingIds = paymentIntent.metadata.bookingIds?.split(',') || [];
        console.log('Looking for bookings:', bookingIds);

        if (paymentIntent.status === 'succeeded') {
            // Update all associated bookings to confirmed
            const updateResult = await Booking.updateMany(
                {
                    _id: { $in: bookingIds },
                    status: 'pending'
                },
                {
                    $set: {
                        status: 'confirmed',
                        paymentStatus: 'succeeded',
                        paymentDetails: {
                            status: 'succeeded',
                            confirmedAt: new Date(),
                            amount: paymentIntent.amount,
                            currency: paymentIntent.currency,
                            paymentMethodType: paymentIntent.payment_method_types?.[0] || 'card'
                        },
                        updatedAt: new Date()
                    }
                }
            );

            console.log('Update result:', {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount
            });

            // Get updated bookings
            const bookings = await Booking.find({ _id: { $in: bookingIds } });
            console.log(`Found ${bookings.length} bookings to process`);

            if (bookings.length === 0) {
                return NextResponse.json({ error: 'No bookings found' }, { status: 404 });
            }

            // Get user details
            const user = await User.findById(session.user.id);
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Update user verification status if not already verified
            if (!user.isVerified) {
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            isVerified: true,
                            verifiedAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                );
                console.log('Updated user verification status');
            }

            // Update user membership status based on booking type
            const hasMembershipBooking = bookings.some(booking => booking.bookingType === 'monthly');
            if (hasMembershipBooking && !user.isMembershipActive) {
                await User.findByIdAndUpdate(
                    user._id,
                    {
                        $set: {
                            isMembershipActive: true,
                            membershipActivatedAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                );
                console.log('Updated user membership status to active');
            }

            // Send confirmation email if user has email notifications enabled
            if (user.preferences?.emailNotifications) {
                try {
                    for (const booking of bookings) {
                        const { subject, html } = getBookingConfirmationEmail({
                            customerName: `${user.firstName} ${user.lastName}`,
                            bookingId: booking._id,
                            bookingType: booking.bookingType,
                            totalAmount: booking.totalAmount,
                            rooms: booking.rooms
                        });

                        await sendEmail({
                            to: user.email,
                            subject,
                            html
                        });

                        console.log('Booking confirmation email sent successfully for booking:', booking._id);
                    }
                } catch (error) {
                    console.error('Failed to send booking confirmation email:', error);
                    // Don't throw error here as payment is still successful
                }
            }

            return NextResponse.json({
                success: true,
                message: 'Payment verified and bookings confirmed',
                bookings: bookings.map(b => b._id)
            });
        } else {
            // Payment failed or was cancelled - update bookings to failed status
            const updateResult = await Booking.updateMany(
                {
                    _id: { $in: bookingIds },
                    status: 'pending'
                },
                {
                    $set: {
                        status: 'cancelled',
                        paymentStatus: 'failed',
                        paymentDetails: {
                            status: 'failed',
                            updatedAt: new Date(),
                            error: {
                                message: paymentIntent.last_payment_error?.message || 'Payment was not successful',
                                code: paymentIntent.last_payment_error?.code,
                                decline_code: paymentIntent.last_payment_error?.decline_code
                            }
                        }
                    }
                }
            );

            console.log('Updated failed bookings:', {
                matched: updateResult.matchedCount,
                modified: updateResult.modifiedCount
            });

            return NextResponse.json({
                success: false,
                message: 'Payment not succeeded',
                status: paymentIntent.status,
                error: paymentIntent.last_payment_error?.message || 'Payment was not successful'
            });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        return NextResponse.json(
            { error: 'Failed to verify payment' },
            { status: 500 }
        );
    }
} 