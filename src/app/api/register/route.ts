import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const body = await req.json();

        // Check if user already exists
        const existingUser = await User.findOne({ email: body.email });
        if (existingUser) {
            return NextResponse.json(
                { message: 'User with this email already exists' },
                { status: 400 }
            );
        }

        // Create new user
        const user = await User.create(body);

        // Remove password from response
        const userResponse = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt
        };

        return NextResponse.json(
            { message: 'User registered successfully', user: userResponse },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Error registering user' },
            { status: 500 }
        );
    }
} 