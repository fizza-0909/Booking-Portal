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
        
        // Add logging to debug the query
        console.log('Verifying code:', { email: email.toLowerCase().trim(), code });
        
        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            verificationCode: code,
            verificationCodeExpires: { $gt: new Date() },
            isEmailVerified: false
        });

        if (!user) {
            console.log('No user found with matching verification code');
            return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
        }

        console.log('User found, updating verification status');
        
        user.isEmailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        
        console.log('User verification completed successfully');
        
        return NextResponse.json({ success: true, message: 'Email verified successfully.' });
    } catch (error) {
        console.error('Code verification error:', error);
        return NextResponse.json({ error: 'Error verifying code.' }, { status: 500 });
    }
} 