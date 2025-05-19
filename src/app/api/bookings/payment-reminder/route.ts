import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import User from '@/models/User';
import { sendEmail, getIncompletePaymentEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json(
                { error: 'Booking ID is required' },
                { status: 400 }
            );
        }

        // Get booking details
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return NextResponse.json(
                { error: 'Booking not found' },
                { status: 404 }
            );
        }

        // Get user details
        const user = await User.findById(booking.userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Only send email if user has email notifications enabled
        if (user.preferences?.emailNotifications) {
            try {
                const { subject, html } = getIncompletePaymentEmail({
                    customerName: `${user.firstName} ${user.lastName}`,
                    bookingId: booking._id,
                    totalAmount: booking.totalAmount,
                    rooms: booking.rooms
                });

                await sendEmail({
                    to: user.email,
                    subject,
                    html
                });

                console.log('Payment reminder email sent successfully');
            } catch (error) {
                console.error('Failed to send payment reminder email:', error);
                return NextResponse.json(
                    { error: 'Failed to send payment reminder' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            message: 'Payment reminder sent successfully'
        });
    } catch (error) {
        console.error('Error sending payment reminder:', error);
        return NextResponse.json(
            { error: 'Failed to process payment reminder' },
            { status: 500 }
        );
    }
} 