import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('Fetching bookings for user:', session.user.id);
        await dbConnect();

        // Find all bookings for the user
        const bookings = await Booking.find({
            userId: session.user.id
        }).sort({ createdAt: -1 }).lean();

        console.log(`Found ${bookings.length} bookings for user`);

        // Group bookings by room and payment intent
        const groupedBookings = bookings.reduce((acc: any[], booking) => {
            // For each room in the booking
            booking.rooms.forEach(room => {
                // Format dates to be human-readable
                const formattedDates = room.dates.map(date =>
                    new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })
                );

                const existingBooking = acc.find(b =>
                    b.roomId === room.id &&
                    b.timeSlot === room.timeSlot &&
                    b.paymentIntentId === booking.paymentIntentId
                );

                // Format the creation date
                const createdDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Date not available';

                if (existingBooking) {
                    existingBooking.dates = [...new Set([...existingBooking.dates, ...formattedDates])].sort();
                } else {
                    acc.push({
                        _id: booking._id,
                        roomId: room.id,
                        name: room.name || `Room ${room.id}`,
                        timeSlot: room.timeSlot,
                        dates: formattedDates,
                        status: booking.status,
                        paymentStatus: booking.paymentStatus,
                        totalAmount: booking.totalAmount,
                        paymentIntentId: booking.paymentIntentId,
                        createdAt: createdDate,
                        paymentError: booking.paymentError
                    });
                }
            });
            return acc;
        }, []);

        console.log(`Grouped into ${groupedBookings.length} unique bookings`);

        return NextResponse.json({
            bookings: groupedBookings
        });
    } catch (error) {
        console.error('Failed to fetch bookings:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch bookings',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 