'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { Appearance } from '@stripe/stripe-js';
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
const appearance: Appearance = {
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

const PaymentForm = ({ priceBreakdown, clientSecret }: { priceBreakdown: PriceBreakdown; clientSecret: string }) => {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const { update } = useSession();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateVerificationStatus = async () => {
        try {
            console.log('Updating user verification status after payment...');
            const verifyResponse = await fetch('/api/user/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                console.log('Successfully verified user after payment:', verifyData);
                await update();
            } else {
                console.error('Failed to verify user after payment');
            }
        } catch (error) {
            console.error('Error updating verification status after payment:', error);
        }
    };

    useEffect(() => {
        if (!stripe) {
            return;
        }

        const query = new URLSearchParams(window.location.search);
        const paymentIntentClientSecret = query.get('payment_intent_client_secret');

        if (paymentIntentClientSecret) {
            stripe.retrievePaymentIntent(paymentIntentClientSecret).then(async ({ paymentIntent }) => {
                switch (paymentIntent?.status) {
                    case 'succeeded':
                        try {
                            const bookingData = sessionStorage.getItem('bookingData');
                            if (!bookingData) {
                                throw new Error('No booking data found');
                            }

                            const parsedBookingData = JSON.parse(bookingData);
                            if (!parsedBookingData.rooms || !parsedBookingData.totalAmount) {
                                throw new Error('Invalid booking data structure');
                            }

                            // First confirm the payment status
                            const confirmResponse = await fetch('/api/bookings/confirm', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    ...parsedBookingData,
                                    paymentIntentId: paymentIntent.id,
                                    paymentStatus: 'succeeded',
                                    paymentDetails: {
                                        status: 'succeeded',
                                        confirmedAt: new Date(),
                                        amount: parsedBookingData.totalAmount,
                                        currency: paymentIntent.currency,
                                        paymentMethodType: paymentIntent.payment_method_types?.[0] || 'card'
                                    }
                                })
                            });

                            if (!confirmResponse.ok) {
                                const errorData = await confirmResponse.json();
                                throw new Error(errorData.error || 'Failed to confirm booking with server');
                            }

                            // Then update verification status
                            const verifyResponse = await fetch('/api/user/verify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });

                            if (!verifyResponse.ok) {
                                console.error('Warning: Failed to verify user after payment');
                            } else {
                                await update();
                            }

                            // Clear session storage
                            sessionStorage.removeItem('bookingData');
                            sessionStorage.removeItem('paymentIntent');
                            // Store confirmation data
                            sessionStorage.setItem('confirmationData', JSON.stringify({
                                ...parsedBookingData,
                                paymentStatus: 'succeeded',
                                confirmedAt: new Date()
                            }));

                            toast.success('Payment successful! Redirecting to confirmation...');
                            router.replace('/booking/confirmation');
                        } catch (error) {
                            console.error('Error handling payment success:', error);
                            // Try to fix the status if something went wrong
                            try {
                                await fetch('/api/bookings/fix-status', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ paymentIntentId: paymentIntent.id })
                                });
                            } catch (fixError) {
                                console.error('Failed to fix booking status:', fixError);
                            }
                            toast.error('Error processing payment confirmation. Please check My Bookings for status.');
                            router.replace('/my-bookings');
                        }
                        break;
                    case 'processing':
                        toast.loading('Payment is processing...');
                        break;
                    case 'requires_payment_method':
                        toast.error('Your payment was not successful, please try again.');
                        break;
                    default:
                        toast.error('Something went wrong with the payment.');
                        break;
                }
            });
        }
    }, [stripe, router, update]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements || isSubmitting || processing) {
            return;
        }

        setIsSubmitting(true);
        setProcessing(true);
        setError(null);

        try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
                throw new Error(submitError.message);
            }

            const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/booking/confirmation`,
                },
            });

            if (confirmError) {
                throw new Error(confirmError.message);
            }
        } catch (err) {
            console.error('Payment processing error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Payment failed';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setProcessing(false);
            setIsSubmitting(false);
        }
    };

    if (!stripe || !elements) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-lg text-gray-600">Loading payment form...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <PaymentElement />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || processing}
                className={`w-full py-4 px-6 rounded-lg text-white font-medium text-lg flex items-center justify-center space-x-2
                    ${!stripe || processing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#635BFF] hover:bg-[#5851EA] transition-colors duration-200'}`}
            >
                {processing ? (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                        Processing...
                    </div>
                ) : (
                    <>
                        <span>Pay ${priceBreakdown.total.toFixed(2)} with</span>
                        <svg className="h-6 ml-2" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.1 1.03a4.7 4.7 0 0 1 3.28-1.29c3.28 0 5.52 3.33 5.52 7.52 0 4.7-2.25 7.47-5.62 7.47zM40 8.95c-.9 0-1.81.37-2.28.93l.02 7.43c.44.5 1.3.93 2.26.93 1.76 0 2.98-1.84 2.98-4.64 0-2.84-1.24-4.65-2.98-4.65zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.8 2.2 2.84 3.72 2.84v3.75c-2.15 0-4.31-.23-5.89-1.66-1.7-1.57-1.95-3.71-1.95-5.73V3.51l4.12-.88v4.01h3.72v3.35h-3.72v4.26zm-8.61-4.72v9.79H2.64V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86z" fillRule="evenodd"></path>
                        </svg>
                    </>
                )}
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
    const { data: session, status, update } = useSession();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>({
        subtotal: 0,
        tax: 0,
        securityDeposit: 0,
        total: 0,
        isMembershipActive: false
    });

    useEffect(() => {
        // Only update session when visibility changes
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                update();
            }
        };
        
        // Check authentication status
        if (status === 'unauthenticated') {
            toast.error('Please login to continue');
            router.push('/login?callbackUrl=/booking/payment');
            return;
        }

        // Add visibility listener
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [status, router, update]);

    useEffect(() => {
        const initializePage = async () => {
            try {
                // Always use the original bookingData for price calculation
                const originalBookingDataStr = sessionStorage.getItem('bookingData');
                const paymentIntent = sessionStorage.getItem('paymentIntent');

                if (!originalBookingDataStr || !paymentIntent) {
                    toast.error('No booking details found');
                    router.push('/booking');
                    return;
                }

                let originalBookingData: BookingData;
                try {
                    originalBookingData = JSON.parse(originalBookingDataStr);
                } catch (error) {
                    toast.error('Invalid booking data');
                    router.push('/booking');
                    return;
                }

                if (!originalBookingData.rooms || !Array.isArray(originalBookingData.rooms) || originalBookingData.rooms.length === 0) {
                    toast.error('No valid booking details found');
                    router.push('/booking');
                    return;
                }

                if (!originalBookingData.totalAmount || originalBookingData.totalAmount <= 0) {
                    toast.error('Invalid booking data: Invalid amount');
                    router.push('/booking');
                    return;
                }

                // Get user verification status
                const userResponse = await fetch('/api/user/status');
                const userData = await userResponse.json();
                const isMembershipActive = userData.isMembershipActive;

                // Calculate price breakdown based on verification status
                console.log('PAYMENT PAGE:', { rooms: originalBookingData.rooms, bookingType: originalBookingData.bookingType, isMembershipActive });
                const priceBreakdownData = calculatePrice(
                    originalBookingData.rooms,
                    originalBookingData.bookingType,
                    isMembershipActive
                );
                setPriceBreakdown({ ...priceBreakdownData, isMembershipActive });
                const { clientSecret } = JSON.parse(paymentIntent);
                setClientSecret(clientSecret);
            } catch (error) {
                setError(error instanceof Error ? error.message : 'Failed to initialize payment page');
                router.push('/booking');
            } finally {
                setIsLoading(false);
            }
        };

        if (status === 'authenticated') {
            initializePage();
        }
    }, [status, router]);

    // Show loading state while checking authentication or initializing
    if (status === 'loading' || isLoading) {
        return <LoadingSpinner />;
    }

    // If not authenticated, don't render anything
    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <Header />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => router.push('/summary')}
                        className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Summary
                    </button>

                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-8">Payment Details</h1>

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{error}</span>
                            </div>
                        )}

                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4">Price Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${priceBreakdown.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax (3.5%)</span>
                                    <span>${priceBreakdown.tax.toFixed(2)}</span>
                                </div>
                                {!priceBreakdown.isMembershipActive && (
                                    <div className="flex justify-between text-gray-600">
                                        <div>
                                            <span>Security Deposit</span>
                                            <div className="text-xs text-gray-500">
                                                (Required for first booking - $250 per room, refundable)
                                            </div>
                                        </div>
                                        <span>${priceBreakdown.securityDeposit.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span className="text-blue-600">${priceBreakdown.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {clientSecret && (
                            <>
                                <Elements
                                    stripe={stripePromise}
                                    options={{
                                        clientSecret,
                                        appearance,
                                    }}
                                >
                                    <PaymentForm priceBreakdown={priceBreakdown} clientSecret={clientSecret} />
                                </Elements>

                                <div className="mt-8 flex items-center justify-center space-x-2 text-gray-500 text-sm">
                                    <span>Powered by</span>
                                    <svg className="h-6" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                        <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.1 1.03a4.7 4.7 0 0 1 3.28-1.29c3.28 0 5.52 3.33 5.52 7.52 0 4.7-2.25 7.47-5.62 7.47zM40 8.95c-.9 0-1.81.37-2.28.93l.02 7.43c.44.5 1.3.93 2.26.93 1.76 0 2.98-1.84 2.98-4.64 0-2.84-1.24-4.65-2.98-4.65zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.8 2.2 2.84 3.72 2.84v3.75c-2.15 0-4.31-.23-5.89-1.66-1.7-1.57-1.95-3.71-1.95-5.73V3.51l4.12-.88v4.01h3.72v3.35h-3.72v4.26zm-8.61-4.72v9.79H2.64V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86z" fillRule="evenodd"></path>
                                    </svg>
                                </div>
                            </>
                        )}

                        {!clientSecret && !error && (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PaymentPage; 