'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import toast from 'react-hot-toast';

interface Booking {
    _id: string;
    roomId: string;
    date: string;
    timeSlot: 'full' | 'morning' | 'evening';
    bookingType: 'daily' | 'monthly';
    amount: number;
    createdAt: string;
}

const MyBookingsPage = () => {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await fetch('/api/user/bookings');
                if (!response.ok) {
                    throw new Error('Failed to fetch bookings');
                }
                const data = await response.json();
                setBookings(data.bookings);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                toast.error('Failed to load booking history');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBookings();
    }, []);

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

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleDownloadBooking = (booking: Booking) => {
        if (isDownloading) return;

        setIsDownloading(true);
        try {
            // Create booking summary text
            const summary = [
                '=== HIRE A CLINIC - BOOKING CONFIRMATION ===',
                '',
                `Booking ID: ${booking._id}`,
                `Room: Room ${booking.roomId}`,
                `Date: ${formatDate(booking.date)}`,
                `Time Slot: ${getTimeSlotText(booking.timeSlot)}`,
                `Booking Type: ${booking.bookingType.charAt(0).toUpperCase() + booking.bookingType.slice(1)}`,
                `Amount Paid: $${(booking.amount ?? 0).toFixed(2)}`,
                `Booking Date: ${new Date(booking.createdAt).toLocaleString()}`,
                '',
                '=== ADDITIONAL INFORMATION ===',
                'Security Deposit: $250.00 (Refundable)',
                '',
                'Thank you for choosing Hire a Clinic!',
                'For any queries, please contact our support team.',
                '',
                '=== TERMS AND CONDITIONS ===',
                '1. Please arrive 15 minutes before your scheduled time',
                '2. Cancellations must be made 48 hours in advance',
                '3. Please follow all clinic safety protocols',
                '4. Keep this confirmation for your records'
            ].join('\n');

            // Create blob and download
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summary));
            element.setAttribute('download', `booking-${booking._id}.txt`);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            toast.success('Booking confirmation downloaded successfully');
        } catch (error) {
            console.error('Error downloading booking:', error);
            toast.error('Failed to download booking confirmation');
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
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
            <div className="max-w-7xl mx-auto px-4 pt-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
                    <p className="text-gray-600 mt-2">View and manage your booking history</p>
                </div>

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-8 text-center">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Bookings Found</h2>
                        <p className="text-gray-600 mb-6">You haven't made any bookings yet.</p>
                        <button
                            onClick={() => router.push('/booking')}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Make a Booking
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings.map((booking) => (
                            <div
                                key={booking._id}
                                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div>
                                        <span className="text-gray-600 text-sm">Room</span>
                                        <p className="font-semibold">Room {booking.roomId}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 text-sm">Date</span>
                                        <p className="font-semibold">{formatDate(booking.date)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 text-sm">Time Slot</span>
                                        <p className="font-semibold">{getTimeSlotText(booking.timeSlot)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 text-sm">Amount</span>
                                        <p className="font-semibold">
                                            ${(booking.amount ?? 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="text-gray-600 text-sm">Booking Type</span>
                                            <p className="font-semibold capitalize">{booking.bookingType}</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <div className="text-sm text-gray-500">
                                                Booked on {new Date(booking.createdAt).toLocaleDateString()}
                                            </div>
                                            <button
                                                onClick={() => handleDownloadBooking(booking)}
                                                disabled={isDownloading}
                                                className={`flex items-center text-blue-600 hover:text-blue-800 ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''
                                                    }`}
                                            >
                                                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                {isDownloading ? 'Downloading...' : 'Download'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyBookingsPage; 