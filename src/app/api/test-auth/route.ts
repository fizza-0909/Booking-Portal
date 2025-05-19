import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
    try {
        await dbConnect();
        console.log('Connected to MongoDB');

        // Create a test user
        const testUser = {
            email: 'test@example.com',
            password: await hash('password123', 12),
            firstName: 'Test',
            lastName: 'User',
            hasBookings: false
        };

        // Check if user exists
        const existingUser = await User.findOne({ email: testUser.email });

        if (existingUser) {
            console.log('Test user already exists');
            return NextResponse.json({
                message: 'Test user already exists',
                email: testUser.email,
                password: 'password123' // Only for testing
            });
        }

        // Create new user
        const user = await User.create(testUser);
        console.log('Test user created:', user.email);

        return NextResponse.json({
            message: 'Test user created successfully',
            email: user.email,
            password: 'password123' // Only for testing
        });
    } catch (error: any) {
        console.error('Error creating test user:', error);
        return NextResponse.json({
            error: error.message || 'Failed to create test user'
        }, { status: 500 });
    }
} 