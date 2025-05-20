import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';
import { Document, Model } from 'mongoose';

interface IBookingDate {
    date: string;
    startTime: string;
    endTime: string;
}

interface IBookingRoom {
    roomId: string;
    name: string;
    timeSlot: 'morning' | 'evening' | 'full';
    dates: IBookingDate[];
}

interface IBookingDocument extends Document {
    userId: string;
    rooms: IBookingRoom[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
    status: string;
    paymentStatus: string;
    paymentDetails: {
        status: string;
        confirmedAt?: Date;
        updatedAt?: Date;
        amount?: number;
        currency?: string;
        paymentMethodType?: string;
        error?: {
            message?: string;
            code?: string;
            decline_code?: string;
        };
    };
    isMembershipActive: boolean;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-04-30.basil'
});

export async function POST(req: Request) {
    try {
        console.log('Starting payment verification process...');
        
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
        const { clientSecret } = body;

        if (!clientSecret) {
            console.error('No client secret provided');
            return NextResponse.json(
                { error: 'Payment client secret is required' },
                { status: 400 }
            );
        }

        // Extract payment intent ID from client secret
        const paymentIntentId = clientSecret.split('_secret_')[0];
        console.log('Processing payment intent:', paymentIntentId);

        // Retrieve payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        console.log('Payment intent status:', paymentIntent.status);

        await dbConnect();
        console.log('Connected to database');

        // Get the booking using metadata from payment intent
        const bookingId = paymentIntent.metadata.bookingId;
        console.log('Looking for booking:', bookingId);

        if (!bookingId) {
            console.error('No booking ID found in payment intent metadata');
            return NextResponse.json({ error: 'No booking found' }, { status: 404 });
        }

        const booking = await Booking.findById(bookingId).exec() as IBookingDocument;
        if (!booking) {
            console.error('Booking not found:', bookingId);
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        if (paymentIntent.status === 'succeeded') {
            // Get user details first
            const user = await User.findById(session.user.id);
            if (!user) {
                console.error('User not found:', session.user.id);
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            console.log('Current user status:', {
                userId: user._id,
                isMembershipActive: user.isMembershipActive
            });

            // Check if we should activate membership
            const shouldActivateMembership = paymentIntent.metadata?.shouldActivateMembership === 'true';
            
            // Update user membership status if needed
            if (shouldActivateMembership && !user.isMembershipActive) {
                console.log('Activating membership for user:', user._id);
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

                console.log('Membership activated:', {
                    userId: updatedUser._id,
                    isMembershipActive: updatedUser.isMembershipActive,
                    activatedAt: updatedUser.membershipActivatedAt
                });

                // Update session to reflect membership status
                if (session.user) {
                    session.user.isMembershipActive = true;
                }
            }

            // Update booking status
            const updatedBooking = await Booking.findByIdAndUpdate(
                booking._id,
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
                        isMembershipActive: true,
                        updatedAt: new Date()
                    }
                },
                { new: true }
            ).exec() as IBookingDocument;

            console.log('Updated booking:', {
                bookingId: updatedBooking._id,
                status: updatedBooking.status,
                paymentStatus: updatedBooking.paymentStatus,
                isMembershipActive: updatedBooking.isMembershipActive
            });

            // Send confirmation email
            try {
                const { subject, html } = getBookingConfirmationEmail({
                    customerName: `${user.firstName} ${user.lastName}`,
                    bookingId: updatedBooking._id.toString(),
                    bookingType: updatedBooking.bookingType,
                    totalAmount: updatedBooking.totalAmount,
                    rooms: updatedBooking.rooms
                });

                await sendEmail({
                    to: user.email,
                    subject,
                    html
                });

                console.log('Sent booking confirmation email');
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
            }

            return NextResponse.json({
                message: 'Payment verified and status updated successfully',
                booking: updatedBooking,
                membershipStatus: {
                    isMembershipActive: true,
                    activatedAt: new Date()
                }
            });
        } else {
            console.log('Payment not succeeded:', paymentIntent.status);
            
            // Update booking status to failed
            const updatedBooking = await Booking.findByIdAndUpdate(
                booking._id,
                {
                    $set: {
                        status: 'failed',
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
                },
                { new: true }
            ).exec() as IBookingDocument;

            console.log('Updated failed booking:', {
                bookingId: updatedBooking._id,
                status: updatedBooking.status,
                paymentStatus: updatedBooking.paymentStatus
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