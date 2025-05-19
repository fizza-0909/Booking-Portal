import { NextResponse } from 'next/server';

export async function GET() {
    // Mask the keys for security while still showing enough to verify
    const maskKey = (key: string | undefined) => {
        if (!key) return 'Not set';
        if (key.startsWith('sk_test_')) return `sk_test_...${key.slice(-4)}`;
        if (key.startsWith('pk_test_')) return `pk_test_...${key.slice(-4)}`;
        if (key.startsWith('whsec_')) return `whsec_...${key.slice(-4)}`;
        return 'Invalid key format';
    };

    return NextResponse.json({
        stripe_secret: {
            exists: !!process.env.STRIPE_SECRET_KEY,
            format: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'),
            masked: maskKey(process.env.STRIPE_SECRET_KEY)
        },
        stripe_publishable: {
            exists: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
            format: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_') || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_'),
            masked: maskKey(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
        },
        webhook_secret: {
            exists: !!process.env.STRIPE_WEBHOOK_SECRET,
            format: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
            masked: maskKey(process.env.STRIPE_WEBHOOK_SECRET)
        }
    });
} 