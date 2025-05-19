import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
    try {
        console.log('Creating test user...');
        const { db } = await connectToDatabase();

        // Hash the password
        const hashedPassword = await hash('testpassword123', 12);

        // Create test user
        const testUser = {
            email: 'test@example.com',
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            createdAt: new Date(),
            hasBookings: false
        };

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: testUser.email });

        if (existingUser) {
            return NextResponse.json({
                status: 'error',
                message: 'Test user already exists',
                email: testUser.email
            });
        }

        // Insert the test user
        const result = await db.collection('users').insertOne(testUser);

        return NextResponse.json({
            status: 'success',
            message: 'Test user created successfully',
            userId: result.insertedId.toString(),
            email: testUser.email
        });
    } catch (error) {
        console.error('Failed to create test user:', error);
        return NextResponse.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Failed to create test user'
        }, { status: 500 });
    }
} 