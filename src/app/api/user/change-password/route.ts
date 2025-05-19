import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { compare, hash } from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Both current and new password are required' },
                { status: 400 }
            );
        }

        // Get user with password
        const user = await User.findById(session.user.id).select('+password');
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValid = await compare(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await hash(newPassword, 12);

        // Update password
        user.password = hashedPassword;
        await user.save();

        return NextResponse.json({
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json(
            { error: 'Failed to change password' },
            { status: 500 }
        );
    }
} 