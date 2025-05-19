import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('Starting user verification process for:', session.user.id);
        await dbConnect();

        // Find and update user's verification status
        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            {
                $set: {
                    isVerified: true,
                    updatedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            console.error('User not found:', session.user.id);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('User verified successfully:', {
            userId: updatedUser._id,
            isVerified: updatedUser.isVerified
        });

        // Return the updated user data
        return NextResponse.json({
            message: 'User verified successfully',
            user: {
                id: updatedUser._id.toString(),
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                name: `${updatedUser.firstName} ${updatedUser.lastName}`,
                isVerified: updatedUser.isVerified
            }
        });
    } catch (error) {
        console.error('Error verifying user:', error);
        return NextResponse.json(
            { error: 'Failed to verify user' },
            { status: 500 }
        );
    }
} 