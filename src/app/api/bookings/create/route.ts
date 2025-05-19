import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import User from '@/models/User';

interface BookingRoom {
    id: number;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: string[];
}

interface PaymentDetails {
    cardLast4: string;
    cardholderName: string;
}

interface BookingData {
    rooms: BookingRoom[];
    bookingType: string;
    totalAmount: number;
    paymentDetails: PaymentDetails;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await dbConnect();

        const bookingData = await req.json();

        // Validate booking data
        if (!bookingData.rooms || !bookingData.bookingType || !bookingData.totalAmount) {
            return NextResponse.json(
                { error: 'Missing required booking information' },
                { status: 400 }
            );
        }

        // Create the booking
        const booking = await Booking.create({
            userId: session.user.id,
            ...bookingData,
            status: 'pending'
        });

        // Update user's booking status
        await User.findByIdAndUpdate(session.user.id, {
            hasBookings: true
        });

        return NextResponse.json({
            message: 'Booking created successfully',
            bookingId: booking._id
        });
    } catch (error: any) {
        console.error('Error creating booking:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to create booking' },
            { status: 500 }
        );
    }
} 