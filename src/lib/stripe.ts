import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export const createPaymentIntent = async (amount: number) => {
    try {
        const response = await fetch('/api/payment/intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
        });

        return await response.json();
    } catch (error) {
        console.error('Error creating payment intent:', error);
        throw error;
    }
}; 