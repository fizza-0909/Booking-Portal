import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { sendEmail, getVerificationSuccessEmail } from '@/lib/email';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { error: 'Verification token is required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Find user with valid verification token
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        }).select('+verificationToken +verificationTokenExpires');

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired verification token' },
                { status: 400 }
            );
        }

        // Update user verification status
        user.isEmailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        // Send verification success email
        try {
            const { subject, html } = getVerificationSuccessEmail({
                firstName: user.firstName
            });

            await sendEmail({
                to: user.email,
                subject,
                html
            });

            console.log('Verification success email sent');
        } catch (error) {
            console.error('Failed to send verification success email:', error);
            // Don't throw error here as verification is still successful
        }

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        console.error('Email verification error:', error);
        return NextResponse.json(
            { error: 'Error verifying email' },
            { status: 500 }
        );
    }
} 