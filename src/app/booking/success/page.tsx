'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import { PRICING, TimeSlot } from '@/constants/pricing';
import { calculatePrice } from '@/utils/price';

interface BookingDetails {
    bookingId: string;
    rooms: Array<{
        id: number;
        name: string;
        timeSlot: TimeSlot;
        dates: string[];
    }>;
    totalAmount: number;
    bookingType: 'daily' | 'monthly';
    customerName: string;
    bookingDate: string;
    status: string;
}

const MembershipBadge = () => {
    const { data: session } = useSession();
    if (session?.user?.isMembershipActive) {
        return (
            <span className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                Membership activated
            </span>
        );
    }
    return null;
};

const SuccessPageContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, update } = useSession();
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAnimation, setShowAnimation] = useState(true);
    const { status } = useSession();

    useEffect(() => {
        // Refresh session on mount to get latest verification status
        update();
    }, [update]);

    useEffect(() => {
        const confirmBooking = async () => {
            try {
                console.log('Starting booking confirmation process...');
                const bookingData = sessionStorage.getItem('bookingData');
                const paymentIntentId = searchParams.get('payment_intent');
                const bookingId = searchParams.get('booking_id');
                const paymentStatus = searchParams.get('payment_status') || 'succeeded';

                if (!bookingData || !paymentIntentId || !bookingId) {
                    throw new Error('Missing booking data or payment information');
                }

                console.log('Payment info:', { paymentIntentId, paymentStatus, bookingId });
                const parsedBooking = JSON.parse(bookingData);

                // First, verify the payment and update membership status
                console.log('Verifying payment...');
                const verifyResponse = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        clientSecret: paymentIntentId,
                        bookingId
                    }),
                });

                if (!verifyResponse.ok) {
                    console.error('Failed to verify payment status');
                    const errorData = await verifyResponse.json();
                    throw new Error(errorData.message || 'Payment verification failed');
                }

                const verifyResult = await verifyResponse.json();
                console.log('Payment verification result:', verifyResult);

                // Then confirm the booking
                console.log('Confirming booking...');
                const response = await fetch('/api/bookings/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...parsedBooking,
                        paymentIntentId,
                        paymentStatus,
                        bookingId
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to confirm booking');
                }

                const result = await response.json();
                console.log('Booking confirmation result:', result);
                
                // Update session to reflect new membership status
                console.log('Updating session...');
                await update();
                console.log('Session updated');

                // Clear booking data from sessionStorage
                sessionStorage.removeItem('bookingData');
                
                setBookingDetails(result.booking);
                setShowAnimation(false);
                setIsLoading(false);

            } catch (error) {
                console.error('Error in booking confirmation:', error);
                setError(error instanceof Error ? error.message : 'An unexpected error occurred');
                setShowAnimation(false);
                setIsLoading(false);
                toast.error(error instanceof Error ? error.message : 'Failed to confirm booking');
                // Redirect to booking page after error
                setTimeout(() => {
                    router.push('/booking');
                }, 3000);
            }
        };

        if (status === 'authenticated') {
            confirmBooking();
        }
    }, [status, searchParams, router, update]);

    const handleDownload = () => {
        if (!bookingDetails) return;

        // Create booking summary text
        const summary = generateBookingSummary(bookingDetails);

        // Create blob and download
        const blob = new Blob([summary], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `booking-${bookingDetails.bookingId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const generateBookingSummary = (booking: BookingDetails): string => {
        const lines = [
            '=== HIRE A CLINIC - BOOKING CONFIRMATION ===',
            '',
            `Booking ID: ${booking.bookingId}`,
            `Customer Name: ${booking.customerName}`,
            `Booking Date: ${formatDateSafe(booking.bookingDate)}`,
            `Booking Type: ${booking.bookingType.charAt(0).toUpperCase() + booking.bookingType.slice(1)}`,
            '',
            '=== ROOM DETAILS ===',
            ''
        ];

        booking.rooms.forEach(room => {
            lines.push(`Room: ${room.name}`);
            lines.push(`Time Slot: ${room.timeSlot.charAt(0).toUpperCase() + room.timeSlot.slice(1)}`);
            lines.push('Dates:');
            room.dates.forEach(date => {
                lines.push(`  - ${formatDateSafe(date)}`);
            });
            lines.push('');
        });

        lines.push('=== PAYMENT DETAILS ===');
        lines.push(`Total Amount: $${booking.totalAmount.toFixed(2)}`);
        lines.push('Security Deposit: $250.00 (Refundable)');
        lines.push('');
        lines.push('Thank you for choosing Hire a Clinic!');
        lines.push('For any queries, please contact our support team.');

        return lines.join('\n');
    };

    // Helper to safely format dates
    const formatDateSafe = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString + 'T00:00:00');
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString();
    };

    // Add a helper to get price breakdown for display
    const getPriceBreakdown = () => {
        if (!bookingDetails) return { subtotal: 0, tax: 0, securityDeposit: 0, total: 0 };
        // Use the shared utility
        return calculatePrice(
            bookingDetails.rooms,
            bookingDetails.bookingType,
            session?.user?.isMembershipActive ?? false
        );
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Failed</h2>
                            <p className="text-gray-600">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || !bookingDetails) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing Your Booking</h2>
                            <p className="text-gray-600">Please wait while we confirm your payment and finalize your booking...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
                    <div className="text-center mb-8">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                        <p className="text-gray-600">Your booking has been successfully confirmed.</p>
                        <MembershipBadge />
                    </div>

                    <div className="grid gap-6 mb-8">
                        <div className="border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
                            <dl className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm text-gray-600">Booking ID</dt>
                                    <dd className="font-medium">{bookingDetails.bookingId}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-600">Customer Name</dt>
                                    <dd className="font-medium">{bookingDetails.customerName}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-600">Booking Type</dt>
                                    <dd className="font-medium capitalize">{bookingDetails.bookingType}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm text-gray-600">Total Amount</dt>
                                    <dd className="font-medium">${getPriceBreakdown().total.toFixed(2)}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="border rounded-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">Room Details</h2>
                            <div className="space-y-4">
                                {bookingDetails.rooms.map((room, index) => (
                                    <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                                        <h3 className="font-medium mb-2">Room {room.name}</h3>
                                        <dl className="grid grid-cols-2 gap-2">
                                            <div>
                                                <dt className="text-sm text-gray-600">Time Slot</dt>
                                                <dd className="capitalize">{room.timeSlot}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm text-gray-600">Dates</dt>
                                                <dd>{room.dates.map(date => formatDateSafe(date)).join(', ')}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={handleDownload}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Booking Details
                        </button>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuccessPageContent; 