import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import fs from 'fs/promises';
import path from 'path';
import { ObjectId } from 'mongodb';

// Setup logging
const logToFile = async (message: string) => {
    try {
        const logPath = path.join(process.cwd(), 'webhook-logs.txt');
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`; // Use Unix-style line ending

        // Ensure the file exists with proper encoding
        if (!await fs.access(logPath).then(() => true).catch(() => false)) {
            await fs.writeFile(logPath, '', { encoding: 'utf8' });
        }

        // Append the log entry
        await fs.appendFile(logPath, logEntry, {
            encoding: 'utf8',
            flag: 'a'
        });

        // Also log to console for immediate feedback
        console.log(`WEBHOOK: ${message}`);
    } catch (error) {
        console.error('Error writing to log file:', error);
        // If we can't write to the file, at least log to console
        console.log(`WEBHOOK (console only): ${message}`);
    }
};

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is not set in environment variables');
    throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set in environment variables');
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
    try {
        await logToFile('=== Webhook Request Received ===');
        await logToFile(`Request URL: ${req.url}`);
        await logToFile(`Request Method: ${req.method}`);

        const body = await req.text();
        await logToFile(`Request Body: ${body.substring(0, 500)}...`);  // Log first 500 chars of body

        const headersList = headers();
        const signature = headersList.get('stripe-signature');
        await logToFile(`Stripe Signature Present: ${!!signature}`);

        if (!signature) {
            await logToFile('No Stripe signature found in request');
            return NextResponse.json({ error: 'No signature' }, { status: 400 });
        }

        // Verify the webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
            await logToFile(`Event verified successfully - Type: ${event.type}, ID: ${event.id}`);
            await logToFile(`Event Data: ${JSON.stringify(event.data.object, null, 2)}`);
        } catch (err) {
            const error = err as Error;
            await logToFile(`Webhook signature verification failed: ${error.message}`);
            await logToFile(`STRIPE_WEBHOOK_SECRET length: ${process.env.STRIPE_WEBHOOK_SECRET?.length}`);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        if (event.type === 'payment_intent.succeeded') {
            await logToFile('=== Processing Successful Payment ===');
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await logToFile(`Payment Intent ID: ${paymentIntent.id}`);
            await logToFile(`Amount: ${paymentIntent.amount}`);
            await logToFile(`Metadata: ${JSON.stringify(paymentIntent.metadata)}`);

            const { bookingIds } = paymentIntent.metadata || {};

            if (!bookingIds) {
                await logToFile('No booking IDs found in metadata');
                return NextResponse.json({ message: 'No booking IDs found' }, { status: 200 });
            }

            const bookingIdArray = bookingIds.split(',').map(id => new ObjectId(id.trim()));
            await logToFile(`Processing bookings: ${bookingIds}`);

            try {
                // First, verify these bookings exist and are pending
                const existingBookings = await db.collection('bookings')
                    .find({
                        _id: { $in: bookingIdArray },
                        'paymentDetails.status': { $ne: 'succeeded' }
                    })
                    .toArray();

                await logToFile(`Found ${existingBookings.length} bookings to update`);

                if (existingBookings.length === 0) {
                    await logToFile('No eligible bookings found for update');
                    return NextResponse.json({
                        message: 'No eligible bookings found',
                        bookingIds: bookingIds
                    }, { status: 200 });
                }

                const result = await db.collection('bookings').updateMany(
                    {
                        _id: { $in: bookingIdArray },
                        'paymentDetails.status': { $ne: 'succeeded' }
                    },
                    {
                        $set: {
                            status: 'confirmed',
                            paymentStatus: 'succeeded',
                            paymentDetails: {
                                status: 'succeeded',
                                confirmedAt: new Date(),
                                paymentIntentId: paymentIntent.id,
                                amount: paymentIntent.amount,
                                currency: paymentIntent.currency,
                                paymentMethodType: paymentIntent.payment_method_types?.[0] || 'card'
                            },
                            updatedAt: new Date()
                        }
                    }
                );

                await logToFile(`Update result - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

                // Verify the update
                const verifyBookings = await db.collection('bookings')
                    .find({
                        _id: { $in: bookingIdArray },
                        'paymentDetails.status': 'succeeded'
                    })
                    .toArray();

                await logToFile(`Verification - Found ${verifyBookings.length} succeeded bookings`);

                return NextResponse.json({
                    message: 'Payment confirmed and bookings updated',
                    updated: result.modifiedCount,
                    verified: verifyBookings.length
                });
            } catch (dbError) {
                await logToFile(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }
        }

        if (event.type === 'payment_intent.payment_failed') {
            await logToFile('=== Processing Failed Payment ===');
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            await logToFile(`Failed Payment Intent ID: ${paymentIntent.id}`);
            const { bookingIds } = paymentIntent.metadata || {};

            if (!bookingIds) {
                await logToFile('No booking IDs found in failed payment metadata');
                return NextResponse.json({ message: 'No booking IDs found' }, { status: 200 });
            }

            const bookingIdArray = bookingIds.split(',').map(id => new ObjectId(id.trim()));
            await logToFile(`Processing failed bookings: ${bookingIds}`);

            try {
                const result = await db.collection('bookings').updateMany(
                    {
                        _id: { $in: bookingIdArray }
                    },
                    {
                        $set: {
                            status: 'failed',
                            'paymentDetails.status': 'failed',
                            'paymentDetails.failedAt': new Date(),
                            'paymentDetails.failureMessage': paymentIntent.last_payment_error?.message,
                            updatedAt: new Date()
                        }
                    }
                );

                await logToFile(`Failed payment update result - Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
                return NextResponse.json({
                    message: 'Payment failed status updated',
                    updated: result.modifiedCount
                });
            } catch (dbError) {
                await logToFile(`Database error in failed payment: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }
        }

        await logToFile(`Unhandled event type: ${event.type}`);
        return NextResponse.json({ received: true });
    } catch (error) {
        await logToFile(`Webhook processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 400 }
        );
    }
} 