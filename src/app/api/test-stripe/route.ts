import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
        hasStripePublishable: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        hasStripeWebhook: !!process.env.STRIPE_WEBHOOK_SECRET,
        stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.startsWith('sk_') ? 'Valid prefix' : 'Invalid prefix',
        publishableKeyPrefix: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') ? 'Valid prefix' : 'Invalid prefix'
    });
} 