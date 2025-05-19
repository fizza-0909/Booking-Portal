'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import jsPDF from 'jspdf';
import { useSession } from 'next-auth/react';

interface BookingDetails {
    rooms: Array<{
        id: number;
        name: string;
        timeSlot: 'full' | 'morning' | 'evening';
        dates: string[];
    }>;
    totalAmount?: number;
    bookingType: 'daily' | 'monthly';
    bookingDate?: string;
    priceBreakdown: {
        subtotal: number;
        tax: number;
        securityDeposit: number;
        total: number;
    };
}

interface PaymentError {
    message: string;
    code?: string;
    decline_code?: string;
}

const PRICING = {
    daily: {
        full: 300,
        half: 160
    },
    monthly: {
        full: 2000,
        half: 1000
    }
}

const ConfirmationPage = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [paymentError, setPaymentError] = useState<PaymentError | null>(null);
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(true);

    // Define user information with optional chaining for phoneNumber
    const userName = session?.user ? `${session.user.firstName} ${session.user.lastName}` : 'N/A';
    const userEmail = session?.user?.email || 'N/A';
    const userPhone = (session?.user as any)?.phoneNumber || 'N/A';  // Type assertion since phoneNumber is optional

    useEffect(() => {
        const verifyPaymentAndBooking = async () => {
            try {
                // Get stored payment intent and booking data
                const paymentIntentData = sessionStorage.getItem('paymentIntent');
                const bookingData = sessionStorage.getItem('bookingData');

                if (!paymentIntentData || !bookingData) {
                    throw new Error('No payment or booking data found');
                }

                const { clientSecret } = JSON.parse(paymentIntentData);
                const parsedBookingData = JSON.parse(bookingData);

                setIsLoading(true);

                // Verify payment status
                const response = await fetch('/api/payment/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ clientSecret }),
                });

                const paymentStatus = await response.json();

                if (!response.ok) {
                    setPaymentError({
                        message: paymentStatus.error || 'Failed to verify payment'
                    });
                    setBookingDetails(null);
                    return;
                }

                if (paymentStatus.success) {
                    // Payment succeeded
                    setBookingDetails(parsedBookingData);
                    setPaymentError(null);

                    // Clear payment data from session storage
                    sessionStorage.removeItem('paymentIntent');
                    sessionStorage.removeItem('bookingData');
                } else {
                    // Payment failed or is incomplete
                    setPaymentError({
                        message: paymentStatus.message || 'Payment was not completed successfully',
                        code: paymentStatus.code,
                        decline_code: paymentStatus.decline_code
                    });
                    setBookingDetails(null);

                    // Update booking status to failed
                    await fetch('/api/bookings/update-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            bookingIds: parsedBookingData.bookingIds,
                            status: 'failed',
                            paymentError: {
                                message: paymentStatus.message,
                                code: paymentStatus.code,
                                decline_code: paymentStatus.decline_code
                            }
                        }),
                    });
                }
            } catch (error) {
                console.error('Error verifying payment:', error);
                setPaymentError({
                    message: error instanceof Error ? error.message : 'An unknown error occurred'
                });
                setBookingDetails(null);
            } finally {
                setIsLoading(false);
                setShowAnimation(false);
            }
        };

        verifyPaymentAndBooking();
    }, [router]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTimeSlotText = (timeSlot: 'full' | 'morning' | 'evening') => {
        switch (timeSlot) {
            case 'full':
                return '8:00 AM - 5:00 PM';
            case 'morning':
                return '8:00 AM - 12:00 PM';
            case 'evening':
                return '1:00 PM - 5:00 PM';
        }
    };

    const generatePDF = (booking: BookingDetails): jsPDF => {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const margin = 20;
        let yPos = 0;

        // Colors
        const primaryBlue = [37, 99, 235] as [number, number, number];
        const softBlue = [240, 247, 255] as [number, number, number];
        const textGray = [33, 33, 33] as [number, number, number];

        // --- Header Section ---
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.setFontSize(22);
        pdf.setFont("helvetica", "bold");
        const titleText = "HIRE A CLINIC";
        const titleWidth = pdf.getTextWidth(titleText);
        pdf.text(titleText, (pageWidth - titleWidth) / 2, 20);

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "normal");
        const subtitleText = "Booking Confirmation";
        const subtitleWidth = pdf.getTextWidth(subtitleText);
        pdf.setTextColor(textGray[0], textGray[1], textGray[2]);
        pdf.text(subtitleText, (pageWidth - subtitleWidth) / 2, 30);

        // Divider Line
        pdf.setDrawColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 35, pageWidth - margin, 35);

        yPos = 45;

        // --- Customer Details Section ---
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.text("Customer Details", margin, yPos);
        yPos += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(textGray[0], textGray[1], textGray[2]);
        pdf.text(`Name: ${userName}`, margin, yPos + 8);
        pdf.text(`Email: ${userEmail}`, margin, yPos + 16);
        pdf.text(`Phone: ${userPhone || 'N/A'}`, margin, yPos + 24);
        pdf.text(`Booking Number: MAO${Date.now().toString(36).toUpperCase().slice(0, 5)}`, margin, yPos + 32);

        yPos += 50;

        // --- Booking Summary Section ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.text("Booking Summary", margin, yPos);
        yPos += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(textGray[0], textGray[1], textGray[2]);
        pdf.text(`Booking Type: Daily`, margin, yPos + 8);
        pdf.text(`Booking Date: ${formatDate(new Date().toISOString())}`, margin, yPos + 16);

        yPos += 34;

        // --- Room Details Section ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.text("Room Details", margin, yPos);
        yPos += 8;

        bookingDetails?.rooms.forEach((room) => {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(textGray[0], textGray[1], textGray[2]);
            pdf.text(`Room ${room.name}`, margin, yPos + 8);
            pdf.text(`Time Slot: ${getTimeSlotText(room.timeSlot)}`, margin, yPos + 16);
            pdf.text(`Dates: ${room.dates.map(date => formatDate(date)).join(', ')}`, margin, yPos + 24);
            yPos += 32;
        });

        // --- Payment Details Section ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.text("Payment Details", margin, yPos);
        yPos += 8;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(textGray[0], textGray[1], textGray[2]);
        pdf.text(`Subtotal: $${bookingDetails?.priceBreakdown.subtotal.toFixed(2)}`, margin, yPos + 8);
        pdf.text(`Tax: $${bookingDetails?.priceBreakdown.tax.toFixed(2)}`, margin, yPos + 16);
        pdf.text(`Security Deposit (Refundable): $${bookingDetails?.priceBreakdown.securityDeposit.toFixed(2)}`, margin, yPos + 24);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Total Amount: $${bookingDetails?.priceBreakdown.total.toFixed(2)}`, margin, yPos + 36);

        yPos += 50;

        // Check if we need a new page for Terms and Conditions
        if (yPos > pdf.internal.pageSize.height - 100) {
            pdf.addPage();
            yPos = 20;
        }

        // --- Terms and Conditions Section ---
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
        pdf.text("Terms and Conditions", margin, yPos);
        yPos += 12;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(textGray[0], textGray[1], textGray[2]);

        const terms = [
            "• Payments are non-refundable. Only the security deposit is refundable as per policy.",
            "• Renters are responsible for the equipment and space during their booked time slot.",
            "• Clinic owners must maintain a safe and professional environment.",
            "• Renters must respect booking times. If a renter arrives late, extra time will not be provided or compensated.",
            "• Any damages or misuse of the clinic will be deducted from the security deposit.",
            "• All users must follow platform policies regarding cancellations and conduct."
        ];

        terms.forEach((term) => {
            if (yPos > pdf.internal.pageSize.height - 20) {
                pdf.addPage();
                yPos = 20;
            }
            const lines = pdf.splitTextToSize(term, pageWidth - (margin * 2));
            pdf.text(lines, margin, yPos);
            yPos += (lines.length * 6) + 6;
        });

        return pdf;
    };

    const handleDownload = () => {
        if (!bookingDetails) return;
        setIsDownloading(true);

        try {
            const pdf = generatePDF(bookingDetails);
            pdf.save(`booking-confirmation-${new Date().getTime()}.pdf`);
            toast.success('Booking confirmation downloaded successfully');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download booking confirmation');
        } finally {
            setIsDownloading(false);
        }
    };

    const getDisplayAmount = (details: BookingDetails | null): string => {
        if (!details) return '0.00';

        // Try the direct total amount first
        if (details.totalAmount) {
            return details.totalAmount.toFixed(2);
        }

        // Fall back to price breakdown total if available
        if (details.priceBreakdown?.total) {
            return details.priceBreakdown.total.toFixed(2);
        }

        // Calculate from price breakdown components if available
        if (details.priceBreakdown) {
            const { subtotal = 0, tax = 0, securityDeposit = 0 } = details.priceBreakdown;
            return (subtotal + tax + securityDeposit).toFixed(2);
        }

        // Default fallback
        return '0.00';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (paymentError) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow sm:rounded-lg p-6 max-w-3xl mx-auto">
                        <div className="text-center">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                                <h3 className="text-sm font-medium text-red-800 mb-2">Error Details</h3>
                                <p className="text-sm text-red-700">{paymentError.message}</p>
                                {paymentError.code && (
                                    <p className="text-sm text-red-700 mt-1">Error Code: {paymentError.code}</p>
                                )}
                            </div>
                            <div className="mt-6">
                                <button
                                    onClick={() => router.push('/booking')}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Try Booking Again
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!bookingDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">No Booking Found</h1>
                    <p className="text-gray-600 mb-6">We couldn't find your booking confirmation.</p>
                    <button
                        onClick={() => router.push('/booking')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                        Make a New Booking
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white shadow sm:rounded-lg p-6 max-w-3xl mx-auto">
                    <div className="text-center mb-8">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Your payment has been processed successfully and your booking is confirmed.
                        </p>
                    </div>
                    <div className="space-y-8">
                        {/* Customer Details Section */}
                        <section className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-blue-600 mb-4">Customer Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Name</p>
                                    <p className="font-medium">{userName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium">{userEmail}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Phone</p>
                                    <p className="font-medium">{userPhone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Booking Number</p>
                                    <p className="font-medium">{'MAO' + Date.now().toString(36).toUpperCase().slice(0, 5)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Booking Summary Section */}
                        <section className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-blue-600 mb-4">Booking Summary</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">Booking Type</p>
                                    <p className="font-medium capitalize">{bookingDetails.bookingType}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Booking Date</p>
                                    <p className="font-medium">{formatDate(new Date().toISOString())}</p>
                                </div>
                            </div>
                        </section>

                        {/* Room Details Section */}
                        <section className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-blue-600 mb-4">Room Details</h3>
                            <div className="space-y-4">
                                {bookingDetails.rooms.map((room, index) => (
                                    <div key={index} className="border-b pb-4 last:border-b-0">
                                        <p className="font-medium">Room {room.name}</p>
                                        <p className="text-sm text-gray-600">Time Slot: {getTimeSlotText(room.timeSlot)}</p>
                                        <p className="text-sm text-gray-600">
                                            Dates: {room.dates.map(date => formatDate(date)).join(', ')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Payment Details Section */}
                        <section className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-blue-600 mb-4">Payment Details</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal</span>
                                    <span>${bookingDetails.priceBreakdown.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Tax</span>
                                    <span>${bookingDetails.priceBreakdown.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Security Deposit (Refundable)</span>
                                    <span>${bookingDetails.priceBreakdown.securityDeposit.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                                    <span>Total Amount</span>
                                    <span>${bookingDetails.priceBreakdown.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </section>

                        {/* Download and Navigation Buttons */}
                        <div className="flex justify-center gap-4 pt-4">
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 text-lg font-semibold flex items-center"
                            >
                                {isDownloading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download Confirmation
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => router.push('/')}
                                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors text-lg font-semibold flex items-center"
                            >
                                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Back to Main Page
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ConfirmationPage; 