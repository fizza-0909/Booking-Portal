import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Booking from '@/models/Booking';
import type { Document } from 'mongoose';

interface Room {
    roomId: string;
    name: string;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: Array<{
        date: string;
        startTime: string;
        endTime: string;
    }>;
}

interface BookingDocument extends Document {
    rooms: Room[];
    status: string;
}

export async function POST(req: Request) {
    try {
        const { month, year, roomId } = await req.json();

        console.log('Received booking status request');
        console.log('Request parameters:', { month, year, roomId });

        if (!month || !year || !roomId) {
            return NextResponse.json(
                { error: 'Month, year, and roomId are required' },
                { status: 400 }
            );
        }

        await dbConnect();
        console.log('Connecting to database...');

        // Calculate start and end dates for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        console.log('Searching for bookings between:', {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        });

        // Generate array of dates for the month with proper format
        const datesInMonth = Array.from({ length: endDate.getDate() }, (_, i) => {
            const date = new Date(year, month - 1, i + 1);
            return {
                date: date.toISOString().split('T')[0],
                startTime: '08:00',  // Default times, adjust as needed
                endTime: '19:00'
            };
        });

        // Find bookings for the specified room and date range
        const bookings = (await Booking.find({
            'rooms': {
                $elemMatch: {
                    $or: [
                        { 'roomId': roomId.toString() },
                        { 'roomId': parseInt(roomId) }
                    ],
                    'dates.date': {
                        $in: datesInMonth.map(d => d.date)
                    }
                }
            }
        }).select('rooms status').lean()) as unknown as BookingDocument[];

        console.log(`Found ${bookings.length} bookings for room ${roomId}`);

        // Format the response
        const formattedBookings = bookings.flatMap(booking => {
            const roomBooking = booking.rooms.find(r => r.roomId === roomId.toString());
            if (!roomBooking) return [];

            return roomBooking.dates
                .filter(dateObj => {
                    const bookingDate = new Date(dateObj.date);
                    return bookingDate >= startDate && bookingDate <= endDate;
                })
                .map(dateObj => ({
                    date: dateObj.date,
                    roomId: roomId.toString(),
                    timeSlots: [roomBooking.timeSlot],
                    status: booking.status
                }));
        });

        console.log('Formatted bookings:', formattedBookings);

        return NextResponse.json({ bookings: formattedBookings });
    } catch (error) {
        console.error('Error fetching booking status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch booking status' },
            { status: 500 }
        );
    }
} 