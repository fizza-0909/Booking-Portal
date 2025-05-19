import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        // Get the user's session
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Connect to database
        await dbConnect();

        // Fetch bookings using Mongoose
        const bookings = await Booking.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .populate('roomId', 'name description price') // Include room details
            .lean(); // Convert to plain JavaScript objects

        return NextResponse.json({
            bookings: bookings.map(booking => ({
                ...booking,
                _id: booking._id.toString(),
                userId: booking.userId.toString(),
                roomId: {
                    ...booking.roomId,
                    _id: booking.roomId._id.toString()
                }
            }))
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch bookings' },
            { status: 500 }
        );
    }
} 