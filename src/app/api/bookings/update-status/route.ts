import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const { bookingIds, status, paymentError } = await req.json();

        if (!bookingIds || !Array.isArray(bookingIds)) {
            return NextResponse.json(
                { error: 'Booking IDs are required' },
                { status: 400 }
            );
        }

        // Convert string IDs to ObjectId
        const bookingObjectIds = bookingIds.map(id => new ObjectId(id));

        // Update booking status and add payment error details
        const result = await db.collection('bookings').updateMany(
            { _id: { $in: bookingObjectIds } },
            {
                $set: {
                    status: status,
                    'paymentDetails.status': status,
                    'paymentDetails.error': paymentError,
                    'paymentDetails.updatedAt': new Date()
                }
            }
        );

        return NextResponse.json({
            message: 'Booking status updated successfully',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error updating booking status:', error);
        return NextResponse.json(
            { error: 'Failed to update booking status' },
            { status: 500 }
        );
    }
} 