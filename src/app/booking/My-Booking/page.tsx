'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';

interface PaymentError {
    message: string;
    code?: string;
    decline_code?: string;
}

interface SessionUser {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    isVerified?: boolean;
}

interface Booking {
    _id: string;
    roomId: string;
    timeSlot: 'full' | 'morning' | 'evening';
    dates: string[];
    status: 'pending' | 'confirmed' | 'failed';
    totalAmount: number;
    subtotal: number;
    tax: number;
    securityDeposit: number;
    total: number;
    paymentDetails?: {
        status: string;
        createdAt: string;
        confirmedAt?: string;
        error?: {
            message: string;
            code?: string;
            decline_code?: string;
        };
    };
    createdAt: string;
}

const MyBookingsPage = () => {
    const router = useRouter();
    const { data: session, status, update: updateSession } = useSession();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasSecurityDeposit, setHasSecurityDeposit] = useState(false);

    const updateVerificationStatus = async () => {
        try {
            const response = await fetch('/api/user/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                await updateSession();
                setHasSecurityDeposit(true);
            }
        } catch (error) {
            console.error('Error updating verification status:', error);
        }
    };

    useEffect(() => {
        if (status === 'unauthenticated') {
            toast.error('Please login to view your bookings');
            router.push('/login?callbackUrl=/my-bookings');
            return;
        }

        const fetchBookings = async () => {
            try {
                console.log('Fetching user bookings...');
                const response = await fetch('/api/bookings');

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Failed to fetch bookings:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                    throw new Error(errorData.error || 'Failed to fetch bookings');
                }

                const data = await response.json();
                console.log('Successfully fetched bookings:', {
                    count: data.bookings.length,
                    bookings: data.bookings
                });

                setBookings(data.bookings);

                // Check if user has any successful payment
                const hasSuccessfulPayment = data.bookings.some((booking: Booking) =>
                    booking.paymentDetails?.status === 'succeeded'
                );

                console.log('Security deposit status:', { hasSuccessfulPayment });
                if (hasSuccessfulPayment && !session?.user?.isMembershipActive) {
                    await updateVerificationStatus();
                }
            } catch (error) {
                console.error('Error fetching bookings:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to fetch bookings');
            } finally {
                setIsLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchBookings();
        }
    }, [status, router, session?.user?.isMembershipActive, updateSession]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'Invalid Date';
        // Try to parse as YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        // Fallback: try to parse as Date
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return 'Invalid Date';
    };

    const getTimeSlotText = (timeSlot: 'full' | 'morning' | 'evening') => {
        switch (timeSlot) {
            case 'full':
                return 'Full Day';
            case 'morning':
                return 'Morning (8 AM - 2 PM)';
            case 'evening':
                return 'Evening (2 PM - 8 PM)';
            default:
                return timeSlot;
        }
    };

    const getPaymentStatusText = (status: string | undefined) => {
        switch (status) {
            case 'succeeded':
                return 'Paid';
            case 'pending':
                return 'Pending';
            case 'failed':
                return 'Failed';
            case 'rejected':
                return 'Rejected';
            default:
                return 'Not Paid';
        }
    };

    const getPaymentStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'succeeded':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'failed':
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleViewDetails = (booking: Booking) => {
        // Store booking details in sessionStorage
        sessionStorage.setItem('bookingDetails', JSON.stringify(booking));
        router.push(`/booking/details/${booking._id}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <Header />

            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </button>
                        <button
                            onClick={() => router.push('/booking')}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Make New Booking
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto">
                    {bookings.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                            <h2 className="text-xl font-semibold text-gray-700 mb-4">No Bookings Found</h2>
                            <p className="text-gray-600 mb-6">You haven't made any bookings yet.</p>
                            <button
                                onClick={() => router.push('/booking')}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                Make a Booking
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 mb-8">
                                {bookings.map((booking) => (
                                    <div key={booking._id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left Section - Room Info */}
                                            <div className="w-full md:w-1/4 bg-gray-50 p-6 flex flex-col justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-gray-800">Room {booking.roomId}</h2>
                                                    <p className="text-gray-600 mt-2">{getTimeSlotText(booking.timeSlot)}</p>
                                                    <div className={`mt-4 inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.paymentDetails?.status)}`}>
                                                        {getPaymentStatusText(booking.paymentDetails?.status)}
                                                    </div>
                                                </div>
                                                <div className="mt-4">
                                                    <p className="text-sm text-gray-500">Booked on:</p>
                                                    <p className="text-sm font-medium">{formatDate(booking.createdAt)}</p>
                                                    {booking.paymentDetails?.confirmedAt && (
                                                        <div className="mt-2">
                                                            <p className="text-sm text-green-600">Payment confirmed:</p>
                                                            <p className="text-sm font-medium text-green-700">
                                                                {formatDate(booking.paymentDetails.confirmedAt)}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Middle Section - Dates */}
                                            <div className="w-full md:w-2/4 p-6 border-t md:border-t-0 md:border-l md:border-r border-gray-200">
                                                <h3 className="text-sm font-medium text-gray-600 mb-4">Selected Dates:</h3>
                                                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                                    {booking.dates.map((date) => (
                                                        <div key={date} className="bg-gray-50 px-3 py-2 rounded-lg text-sm">
                                                            {formatDate(date)}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Payment Status */}
                                                <div className="mt-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentDetails?.status)}`}>
                                                        {getPaymentStatusText(booking.paymentDetails?.status)}
                                                    </span>
                                                    {(booking.paymentDetails?.status === 'failed' || booking.paymentDetails?.status === 'rejected') && booking.paymentDetails?.error && (
                                                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                                            <h3 className="text-sm font-medium text-red-800 mb-2">Payment Failed</h3>
                                                            <p className="text-sm text-red-700">{booking.paymentDetails.error.message || 'Payment was rejected'}</p>
                                                            {booking.paymentDetails.error.code && (
                                                                <p className="text-xs text-red-600 mt-1">Error Code: {booking.paymentDetails.error.code}</p>
                                                            )}
                                                            {booking.paymentDetails.error.decline_code && (
                                                                <p className="text-xs text-red-600 mt-1">Decline Code: {booking.paymentDetails.error.decline_code}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Section - Price and Actions */}
                                            <div className="w-full md:w-1/4 p-6 bg-gray-50">
                                                <div className="h-full flex flex-col justify-between">
                                                    <div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">Subtotal:</span>
                                                                <span className="font-medium">${booking.subtotal.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">Tax (3.5%):</span>
                                                                <span className="font-medium">${booking.tax.toFixed(2)}</span>
                                                            </div>
                                                            {booking.securityDeposit > 0 && (
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-gray-600">Security Deposit:</span>
                                                                    <span className="font-medium">${booking.securityDeposit.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                                                                <span className="text-gray-800">Total:</span>
                                                                <span className="text-blue-600">${booking.total.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {booking.paymentDetails?.status === 'rejected' ? (
                                                        <button
                                                            onClick={() => router.push('/booking')}
                                                            className="w-full mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                                                        >
                                                            Try New Booking
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleViewDetails(booking)}
                                                            className="w-full mt-4 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                                                        >
                                                            View Details
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Security Deposit Status Card */}
                            <div className={`rounded-2xl shadow-xl p-6 mb-8 ${hasSecurityDeposit ? 'bg-green-50' : 'bg-yellow-50'}`}>
                                <div className="flex items-start space-x-4">
                                    {hasSecurityDeposit ? (
                                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className={`text-lg font-semibold ${hasSecurityDeposit ? 'text-green-800' : 'text-yellow-800'}`}>
                                            {hasSecurityDeposit ? 'Security Deposit Status: Paid' : 'Security Deposit Status: Not Paid'}
                                        </h3>
                                        <p className={`mt-1 ${hasSecurityDeposit ? 'text-green-700' : 'text-yellow-700'}`}>
                                            {hasSecurityDeposit
                                                ? 'Your security deposit of $250 has been paid. This serves as your portal registration fee and makes you a verified user.'
                                                : 'Complete your first booking with a security deposit of $250 to become a verified user.'}
                                        </p>
                                        {!hasSecurityDeposit && (
                                            <button
                                                onClick={() => router.push('/booking')}
                                                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors duration-200"
                                            >
                                                Make a Booking
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyBookingsPage;



