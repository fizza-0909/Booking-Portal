import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            isVerified: user.isVerified,
            verifiedAt: user.verifiedAt,
            hasSecurityDeposit: user.isVerified,
            firstName: user.firstName,
            lastName: user.lastName
        });
    } catch (error) {
        console.error('Error fetching user status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user status' },
            { status: 500 }
        );
    }
} 