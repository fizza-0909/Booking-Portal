import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { Room } from '@/models/Room';

export async function POST() {
    try {
        await dbConnect();
        console.log('Connected to MongoDB');

        // Create test user
        const testUser = await User.create({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'Test',
            lastName: 'User',
            hasBookings: false
        });

        // Create test room
        const testRoom = await Room.create({
            name: 'Test Room',
            description: 'A test room for medical appointments',
            price: {
                fullDay: 200,
                halfDay: 100
            },
            capacity: 4,
            amenities: ['WiFi', 'Air Conditioning', 'Medical Equipment'],
            images: [{
                url: 'https://example.com/room1.jpg',
                alt: 'Test Room Image'
            }],
            isAvailable: true
        });

        return NextResponse.json({
            success: true,
            message: 'Test data created successfully',
            testUser: {
                id: testUser._id,
                email: testUser.email
            },
            testRoom: {
                id: testRoom._id,
                name: testRoom.name
            }
        });
    } catch (error: any) {
        console.error('Error creating test data:', error);
        return NextResponse.json({
            success: false,
            error: error?.message || 'An unknown error occurred'
        }, { status: 500 });
    }
} 