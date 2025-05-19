import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function GET() {
    try {
        await sendEmail({
            to: 'fizanayab5548@gmail.com',
            subject: 'Test Email - ' + new Date().toISOString(),
            html: `
                <div>
                    <h1>Test Email</h1>
                    <p>This is a test email sent at: ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        return NextResponse.json({
            success: true,
            message: 'Test email sent successfully'
        });
    } catch (error) {
        console.error('Error sending test email:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
} 