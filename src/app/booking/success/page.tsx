'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { PRICING, TimeSlot } from '@/constants/pricing';

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
}

const SuccessPage: React.FC = () => {
    const router = useRouter();
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

    useEffect(() => {
        const bookingData = localStorage.getItem('bookingData');
        const userData = localStorage.getItem('user');

        if (!bookingData || !userData) {
            router.push('/');
            return;
        }

        const parsedBooking = JSON.parse(bookingData);
        const parsedUser = JSON.parse(userData);

        setBookingDetails({
            ...parsedBooking,
            bookingId: `BK${Date.now()}`,
            customerName: `${parsedUser.firstName} ${parsedUser.lastName}`,
            bookingDate: new Date().toISOString()
        });
    }, [router]);

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
            `Booking Date: ${new Date(booking.bookingDate).toLocaleString()}`,
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
                lines.push(`  - ${new Date(date).toLocaleDateString()}`);
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
                                    {new Date(bookingDetails.bookingDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Customer Name</p>
                                <p className="font-semibold">{bookingDetails.customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Total Amount</p>
                                <p className="font-semibold">${bookingDetails.totalAmount.toFixed(2)}</p>
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

export default SuccessPage; 