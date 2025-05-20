'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { PRICING, TimeSlot } from '@/constants/pricing';
import { useSession } from 'next-auth/react';
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

    useEffect(() => {
        // Refresh session on mount to get latest verification status
        update();
    }, [update]);

    useEffect(() => {
        const confirmBooking = async () => {
            try {
                const bookingData = localStorage.getItem('bookingData');
                const paymentIntentId = searchParams.get('payment_intent');
                const paymentStatus = searchParams.get('payment_status') || 'succeeded';

                if (!bookingData || !paymentIntentId) {
                    throw new Error('Missing booking data or payment information');
                }

                const parsedBooking = JSON.parse(bookingData);

                // Call the backend to confirm the booking
                const response = await fetch('/api/bookings/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...parsedBooking,
                        paymentIntentId,
                        paymentStatus,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Failed to confirm booking');
                }

                const result = await response.json();
                
                // Update session to reflect new membership status
                await update();

                setBookingDetails({
                    ...parsedBooking,
                    bookingId: result.booking._id,
                    customerName: `${session?.user?.firstName} ${session?.user?.lastName}`,
                    bookingDate: new Date().toISOString(),
                    status: result.booking.status
                });

                // Clear booking data from localStorage
                localStorage.removeItem('bookingData');
            } catch (err) {
                console.error('Error confirming booking:', err);
                setError(err instanceof Error ? err.message : 'Failed to confirm booking');
            } finally {
                setIsLoading(false);
            }
        };

        confirmBooking();
    }, [searchParams, session, update]);

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

    if (!bookingDetails) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="container mx-auto px-4 py-24">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Successful!</h1>
                        <p className="text-gray-600">Your booking has been confirmed and processed successfully.</p>
                    </div>

                    <div className="border-t border-b border-gray-200 py-6 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Booking ID</p>
                                <p className="font-semibold">{bookingDetails.bookingId}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Booking Date</p>
                                <p className="font-semibold">
                                    {formatDateSafe(bookingDetails.bookingDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Customer Name</p>
                                <p className="font-semibold">{bookingDetails.customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="font-semibold">${getPriceBreakdown().total.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Booking Details
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SuccessPage: React.FC = () => {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        }>
            <SuccessPageContent />
        </Suspense>
    );
};

export default SuccessPage; 