import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { db } = await connectToDatabase();

        // Fetch all bookings for the user
        const bookings = await db.collection('bookings')
            .find({
                userId: session.user.id
            })
            .sort({ createdAt: -1 }) // Sort by most recent first
            .toArray();

        return NextResponse.json({
            bookings
        });
    } catch (error) {
        console.error('Failed to fetch user bookings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user bookings' },
            { status: 500 }
        );
    }
} 