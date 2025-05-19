import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: process.env.EMAIL_SERVER_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    debug: true, // Enable debug output
    logger: true // Enable logger output
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

// Generate verification token
export function generateVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours
    return { token, expires };
}

// Generate 6-digit verification code
export function generateVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Code expires in 24 hours
    return { code, expires };
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    try {
        // Verify connection configuration before sending
        await transporter.verify();
        console.log('SMTP connection verified successfully');

        const info = await transporter.sendMail({
            from: `"Hire a Clinic" <${process.env.EMAIL_FROM}>`,
            to,
            subject,
            html,
        });

        console.log('Message sent successfully:', {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
        });
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error in sendEmail:', error);
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
        }
        throw error;
    }
}

// Email templates
export function getBookingConfirmationEmail(booking: any) {
    return {
        subject: 'Booking Confirmation - Hire a Clinic',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6; text-align: center;">Booking Confirmation</h1>
                <p>Dear ${booking.customerName},</p>
                <p>Thank you for booking with Hire a Clinic. Your booking has been confirmed.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #1f2937; margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Booking Type:</strong> ${booking.bookingType}</p>
                    <p><strong>Total Amount:</strong> $${booking.totalAmount.toFixed(2)}</p>
                    
                    <h3 style="color: #1f2937;">Room Details</h3>
                    ${booking.rooms.map((room: any) => `
                        <div style="margin-bottom: 15px;">
                            <p><strong>Room:</strong> ${room.name}</p>
                            <p><strong>Time Slot:</strong> ${room.timeSlot}</p>
                            <p><strong>Dates:</strong></p>
                            <ul>
                                ${room.dates.map((date: string) => `
                                    <li>${new Date(date).toLocaleDateString()}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                
                <p>For any questions or assistance, please don't hesitate to contact us.</p>
                
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Hire a Clinic</p>
                    <p>2140 N Lake Forest Dr #100, McKinney, TX 75071</p>
                </div>
            </div>
        `
    };
}

export function getBookingReminderEmail(booking: any) {
    return {
        subject: 'Upcoming Booking Reminder - Hire a Clinic',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6; text-align: center;">Booking Reminder</h1>
                <p>Dear ${booking.customerName},</p>
                <p>This is a reminder for your upcoming booking at Hire a Clinic.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #1f2937; margin-top: 0;">Booking Details</h2>
                    <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
                    <p><strong>Time Slot:</strong> ${booking.timeSlot}</p>
                    <p><strong>Room:</strong> ${booking.roomName}</p>
                </div>
                
                <p>Please arrive 15 minutes before your scheduled time.</p>
                <p>If you need to make any changes to your booking, please contact us as soon as possible.</p>
                
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Hire a Clinic</p>
                    <p>2140 N Lake Forest Dr #100, McKinney, TX 75071</p>
                </div>
            </div>
        `
    };
}

export function getRegistrationConfirmationEmail({ firstName, lastName, email, verificationToken, verificationCode }: { firstName: string; lastName: string; email: string; verificationToken: string; verificationCode: string }) {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;
    return {
        subject: 'Welcome to Hire a Clinic!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6; text-align: center;">Welcome to Hire a Clinic</h1>
                <p>Dear ${firstName},</p>
                <p>Thank you for registering with Hire a Clinic. To complete your registration and activate your account, you can either:</p>
                <ol>
                  <li>Click the button below</li>
                  <li>Or enter the following 6-digit code on the verification page</li>
                </ol>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
                </div>
                <p style="font-size: 1.2em; text-align: center; letter-spacing: 0.2em; font-weight: bold;">${verificationCode}</p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">${verificationUrl}</p>
                <p>This code and link will expire in 24 hours.</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #1f2937; margin-top: 0;">Your Account Details</h2>
                    <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                </div>
                <p>If you did not create this account, please ignore this email.</p>
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Hire a Clinic</p>
                    <p>2140 N Lake Forest Dr #100, McKinney, TX 75071</p>
                </div>
            </div>
        `
    };
}

export function getVerificationSuccessEmail({ firstName }: { firstName: string }) {
    return {
        subject: 'Email Verified Successfully',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6; text-align: center;">Email Verified Successfully</h1>
                <p>Dear ${firstName},</p>
                <p>Your email has been successfully verified. You can now:</p>
                <ul style="list-style-type: none; padding: 0;">
                    <li style="margin: 10px 0; padding-left: 24px; position: relative;">
                        ✓ Book clinic rooms and facilities
                    </li>
                    <li style="margin: 10px 0; padding-left: 24px; position: relative;">
                        ✓ Manage your bookings
                    </li>
                    <li style="margin: 10px 0; padding-left: 24px; position: relative;">
                        ✓ Update your profile information
                    </li>
                </ul>
                
                <p>To get started, simply <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="color: #3b82f6; text-decoration: none;">log in to your account</a>.</p>
                
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Hire a Clinic</p>
                    <p>2140 N Lake Forest Dr #100, McKinney, TX 75071</p>
                </div>
            </div>
        `
    };
}

export function getIncompletePaymentEmail(booking: any) {
    return {
        subject: 'Complete Your Booking Payment - Hire a Clinic',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #3b82f6; text-align: center;">Complete Your Booking</h1>
                <p>Dear ${booking.customerName},</p>
                <p>We noticed that you haven't completed the payment for your recent booking.</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #1f2937; margin-top: 0;">Booking Details</h2>
                    <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
                    <p><strong>Total Amount:</strong> $${booking.totalAmount.toFixed(2)}</p>
                    
                    <h3 style="color: #1f2937;">Room Details</h3>
                    ${booking.rooms.map((room: any) => `
                        <div style="margin-bottom: 15px;">
                            <p><strong>Room:</strong> ${room.name}</p>
                            <p><strong>Time Slot:</strong> ${room.timeSlot}</p>
                            <p><strong>Dates:</strong></p>
                            <ul>
                                ${room.dates.map((date: string) => `
                                    <li>${new Date(date).toLocaleDateString()}</li>
                                `).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
                
                <p>To complete your booking, please <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/payment/${booking.bookingId}" style="color: #3b82f6; text-decoration: none;">click here to make your payment</a>.</p>
                <p>If you need assistance or have any questions, please don't hesitate to contact us.</p>
                
                <div style="text-align: center; margin-top: 30px; color: #6b7280;">
                    <p>Hire a Clinic</p>
                    <p>2140 N Lake Forest Dr #100, McKinney, TX 75071</p>
                </div>
            </div>
        `
    };
} 