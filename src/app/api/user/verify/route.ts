import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Set membership as active (security deposit paid)
        user.isMembershipActive = true;
        await user.save();

        return NextResponse.json({ 
            success: true, 
            message: 'Membership activated successfully',
            isMembershipActive: true
        });
    } catch (error) {
        console.error('Error activating membership:', error);
        return NextResponse.json(
            { error: 'Failed to activate membership' },
            { status: 500 }
        );
    }
} 