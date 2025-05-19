import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();
        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required.' }, { status: 400 });
        }
        await dbConnect();
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            verificationCode: code,
            verificationCodeExpires: { $gt: new Date() },
            isVerified: false
        });
        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
        }
        user.isEmailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        return NextResponse.json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        console.error('Code verification error:', error);
        return NextResponse.json({ error: 'Error verifying code.' }, { status: 500 });
    }
} 