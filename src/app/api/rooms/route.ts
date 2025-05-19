import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { cache } from 'react';

// Cache room data for 5 minutes
const getRooms = cache(async () => {
    const { db } = await connectToDatabase();
    return db.collection('rooms')
        .find({ isAvailable: true })
        .toArray();
});

export async function GET() {
    try {
        const rooms = await getRooms();
        return NextResponse.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json(
            { message: 'Error fetching rooms' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { db } = await connectToDatabase();
        const body = await req.json();

        // Create new room
        const result = await db.collection('rooms').insertOne(body);

        // Invalidate the getRooms cache by calling it again
        await getRooms();

        return NextResponse.json(
            { message: 'Room created successfully', roomId: result.insertedId },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json(
            { message: 'Error creating room' },
            { status: 500 }
        );
    }
} 