'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';
import { calculatePrice } from '@/utils/price';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Stripe appearance object
const appearance = {
    theme: 'stripe',
    variables: {
        colorPrimary: '#635BFF',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
    },
};

interface PriceBreakdown {
    subtotal: number;
    tax: number;
    securityDeposit: number;
    total: number;
    isMembershipActive: boolean;
}

interface PaymentResponse {
    clientSecret: string;
    bookingIds: string[];
}

interface RoomData {
    id: number;
    name: string;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: string[];
}

interface BookingData {
    rooms: RoomData[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
}

interface TransformedBookingData {
    rooms: {
        roomId: string;
        name: string;
        timeSlot: 'full' | 'morning' | 'evening';
        dates: {
            date: string;
            startTime: string;
            endTime: string;
        }[];    
    }[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
    status: 'pending';
    paymentStatus: 'pending';
}

const PaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('booking_id');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error: submitError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/booking/success?bookingId=${bookingId}`,
                },
            });

            if (submitError) {
                setError(submitError.message || 'An error occurred');
                toast.error(submitError.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError(error instanceof Error ? error.message : 'An error occurred');
            toast.error('Payment failed');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
            <PaymentElement />
            {error && (
                <div className="text-red-500 text-sm">{error}</div>
            )}
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
                    !stripe || isProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors duration-200`}
            >
                {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
        </form>
    );
};

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const PaymentPage = () => {
    const router = useRouter();
    const { status } = useSession();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const paymentIntent = searchParams.get('payment_intent');
    const bookingId = searchParams.get('booking_id');

    useEffect(() => {
        if (status === 'unauthenticated') {
            toast.error('Please login to continue');
            router.push('/login?callbackUrl=/booking/payment');
            return;
        }

        if (paymentIntent) {
            setClientSecret(paymentIntent);
        }
    }, [status, paymentIntent, router]);

    // Show loading state while checking authentication
    if (status === 'loading' || !clientSecret) {
        return <LoadingSpinner />;
    }

    // If not authenticated, don't render anything
    if (status === 'unauthenticated') {
        return null;
    }

    const options: StripeElementsOptions = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#0066cc',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                colorDanger: '#df1b41',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                spacingUnit: '4px',
                borderRadius: '4px'
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Summary
                    </button>

                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-8">Complete Your Payment</h1>

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        <Elements stripe={stripePromise} options={options}>
                            <PaymentForm />
                        </Elements>

                        <div className="mt-8 flex items-center justify-center space-x-2 text-gray-500 text-sm">
                            <span>Powered by</span>
                            <svg className="h-6" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.1 1.03a4.7 4.7 0 0 1 3.28-1.29c3.28 0 5.52 3.33 5.52 7.52 0 4.7-2.25 7.47-5.62 7.47zM40 8.95c-.9 0-1.81.37-2.28.93l.02 7.43c.44.5 1.3.93 2.26.93 1.76 0 2.98-1.84 2.98-4.64 0-2.84-1.24-4.65-2.98-4.65zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.8 2.2 2.84 3.72 2.84v3.75c-2.15 0-4.31-.23-5.89-1.66-1.7-1.57-1.95-3.71-1.95-5.73V3.51l4.12-.88v4.01h3.72v3.35h-3.72v4.26zm-8.61-4.72v9.79H2.64V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86z" fillRule="evenodd"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaymentPage; 