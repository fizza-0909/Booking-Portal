import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';
import { Room } from '@/models/Room';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const month = searchParams.get('month'); // Format: YYYY-MM

        if (!roomId || !month) {
            return NextResponse.json(
                { error: 'Room ID and month are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Verify room exists
        const room = await Room.findById(roomId);
        if (!room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        // Get the start and end dates for the month
        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

        // Get all bookings for this room in the specified month
        const bookings = await Booking.find({
            'rooms': {
                $elemMatch: {
                    'id': Number(roomId),
                    'dates': {
                        $elemMatch: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                }
            },
            status: { $in: ['pending', 'confirmed'] }
        }).select('rooms status').lean();

        // Format the response
        const bookedDates = bookings.flatMap(booking => {
            const roomBooking = booking.rooms.find(r => r.id === Number(roomId));
            if (!roomBooking) return [];

            return roomBooking.dates.map(date => ({
                date,
                timeSlot: roomBooking.timeSlot,
                status: booking.status
            }));
        });

        return NextResponse.json({
            roomId,
            month,
            availability: {
                bookedDates,
                room: {
                    id: room._id,
                    name: room.name,
                    price: room.price
                }
            }
        });
    } catch (error) {
        console.error('Error fetching room availability:', error);
        return NextResponse.json(
            { error: 'Failed to fetch room availability' },
            { status: 500 }
        );
    }
} 