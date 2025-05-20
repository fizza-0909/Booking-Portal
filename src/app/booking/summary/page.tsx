'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PRICING, TimeSlot, BookingType } from '@/constants/pricing';
import Header from '@/components/Header';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import { calculatePrice } from '@/utils/price';

interface Room {
    id: number;
    timeSlot: TimeSlot;
    dates: string[];
}

interface PriceBreakdown {
    subtotal: number;
    tax: number;
    securityDeposit: number;
    total: number;
    isFirstBooking: boolean;
}

interface BookingData {
    rooms: Room[];
    bookingType: BookingType;
    totalAmount: number;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

const SummaryPage = () => {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
    const [bookingType, setBookingType] = useState<BookingType>('daily');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>({
        subtotal: 0,
        tax: 0,
        securityDeposit: 0,
        total: 0,
        isFirstBooking: false
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
            router.push('/login?callbackUrl=/booking/summary');
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
                const bookingDataStr = sessionStorage.getItem('bookingData');
                if (!bookingDataStr) {
                    toast.error('No booking details found');
                    router.push('/booking');
                    return;
                }

                let bookingData: BookingData;
                try {
                    bookingData = JSON.parse(bookingDataStr) as BookingData;
                } catch (error) {
                    console.error('Error parsing booking data:', error);
                    toast.error('Invalid booking data');
                    router.push('/booking');
                    return;
                }

                if (!bookingData.rooms || !Array.isArray(bookingData.rooms) || bookingData.rooms.length === 0) {
                    toast.error('No valid booking details found');
                    router.push('/booking');
                    return;
                }

                setSelectedRooms(bookingData.rooms);
                setBookingType(bookingData.bookingType);

                // Get the verification status from the session
                const isMembershipActive = session?.user?.isMembershipActive ?? false;
                console.log('SUMMARY PAGE:', { rooms: bookingData.rooms, bookingType: bookingData.bookingType, isMembershipActive });

                const priceBreakdownData = calculatePrice(
                    bookingData.rooms,
                    bookingData.bookingType,
                    isMembershipActive
                );
                setPriceBreakdown({ ...priceBreakdownData, isFirstBooking: !isMembershipActive });

                // Only update sessionStorage if the data is not already correct
                if (bookingData.totalAmount !== priceBreakdownData.total) {
                    const updatedBookingData = {
                        ...bookingData,
                        totalAmount: priceBreakdownData.total
                    };
                    sessionStorage.setItem('bookingData', JSON.stringify(updatedBookingData));
                }
            } catch (error) {
                console.error('Error initializing page:', error);
                toast.error('Failed to load booking details');
                router.push('/booking');
            } finally {
                setIsLoading(false);
            }
        };

        if (status === 'authenticated') {
            initializePage();
        }
    }, [router, status, session?.user?.isMembershipActive]);

    // Show loading state while checking authentication or initializing
    if (status === 'loading' || isLoading) {
        return <LoadingSpinner />;
    }

    // If not authenticated, don't render anything
    if (status === 'unauthenticated') {
        return null;
    }

    const handleRemoveDate = (roomId: number, dateToRemove: string) => {
        if (bookingType !== 'daily') {
            toast.error('Dates cannot be modified for monthly bookings');
            return;
        }

        const updatedRooms = selectedRooms.map(room => {
            if (room.id === roomId) {
                const updatedDates = room.dates.filter(date => date !== dateToRemove);
                return {
                    ...room,
                    dates: updatedDates
                };
            }
            return room;
        }).filter(room => room.dates.length > 0);

        if (updatedRooms.length === 0) {
            toast.error('Cannot remove all dates. Please keep at least one booking.');
            return;
        }

        setSelectedRooms(updatedRooms);
        const newPriceBreakdown = calculatePrice(updatedRooms, bookingType, session?.user?.isMembershipActive || false);
        setPriceBreakdown({ ...newPriceBreakdown, isFirstBooking: !(session?.user?.isMembershipActive || false) });

        const bookingData = {
            rooms: updatedRooms,
            bookingType,
            totalAmount: newPriceBreakdown.total
        };
        sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
        toast.success('Date removed successfully');
    };

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr || typeof dateStr !== 'string') {
                console.error('Invalid date input:', dateStr);
                return 'Invalid date';
            }

            const [year, month, day] = dateStr.split('-').map(Number);
            if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
                console.error('Invalid date components:', { year, month, day });
                return 'Invalid date';
            }

            const date = new Date(year, month - 1, day);
            if (isNaN(date.getTime())) {
                console.error('Invalid date object:', date);
                return 'Invalid date';
            }

            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    const handleProceedToPayment = async () => {
        if (!acceptedTerms) {
            toast.error('Please accept the Terms and Conditions to proceed');
            return;
        }

        try {
            setIsProcessing(true);
            console.log('Starting payment process...');

            // Validate the data before proceeding
            if (!selectedRooms || selectedRooms.length === 0) {
                throw new Error('No rooms selected');
            }

            // Log the current state
            console.log('Current state:', {
                selectedRooms,
                bookingType,
                priceBreakdown,
                isMembershipActive: session?.user?.isMembershipActive
            });

            // Ensure all rooms have dates
            const invalidRooms = selectedRooms.filter(room => !room.dates || room.dates.length === 0);
            if (invalidRooms.length > 0) {
                throw new Error('Some rooms have no dates selected');
            }

            if (priceBreakdown.total <= 0) {
                throw new Error('Invalid total amount');
            }

            const paymentData = {
                amount: Math.round(priceBreakdown.total * 100), // Convert to cents for Stripe
                bookingData: {
                    rooms: selectedRooms.map(room => ({
                        id: room.id,
                        timeSlot: room.timeSlot,
                        dates: room.dates.map(date => {
                            if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                return date;
                            }
                            const d = new Date(date);
                            return d.toISOString().split('T')[0];
                        })
                    })),
                    bookingType,
                    totalAmount: priceBreakdown.total,
                    includesSecurityDeposit: !session?.user?.isMembershipActive
                }
            };

            console.log('Sending payment request:', JSON.stringify(paymentData, null, 2));

            const response = await fetch('/api/payment/intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData),
            });

            console.log('Response status:', response.status);
            const responseData = await response.json();
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || 'Failed to create payment intent');
            }

            if (!responseData.clientSecret) {
                throw new Error('No client secret received from payment intent creation');
            }

            // Store booking data with consistent structure
            const bookingDataToStore = {
                rooms: selectedRooms.map(room => ({
                    id: room.id,
                    name: `Room ${room.id}`,
                    timeSlot: room.timeSlot,
                    dates: room.dates.map(date => {
                        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            return date;
                        }
                        const d = new Date(date);
                        return d.toISOString().split('T')[0];
                    })
                })),
                totalAmount: priceBreakdown.total,
                bookingType,
                bookingDate: new Date().toISOString(),
                priceBreakdown: {
                    subtotal: priceBreakdown.subtotal,
                    tax: priceBreakdown.tax,
                    securityDeposit: priceBreakdown.securityDeposit,
                    total: priceBreakdown.total,
                    isFirstBooking: priceBreakdown.isFirstBooking
                }
            };

            console.log('Storing booking data:', JSON.stringify(bookingDataToStore, null, 2));

            // Clear any existing data first
            sessionStorage.removeItem('bookingData');
            sessionStorage.removeItem('paymentIntent');

            // Store new data
            sessionStorage.setItem('bookingData', JSON.stringify(bookingDataToStore));
            sessionStorage.setItem('paymentIntent', JSON.stringify({
                clientSecret: responseData.clientSecret
            }));

            console.log('Data stored, redirecting to payment page...');
            router.push('/booking/payment');
        } catch (error) {
            console.error('Payment setup error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to setup payment. Please try again.');
            // Log the full error details
            console.error('Full error details:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <header className="sticky top-0 left-0 right-0 z-50 bg-white shadow-md">
                <Header />
                <div className="container mx-auto px-4 py-4 mt-6">
                    <button
                        onClick={() => router.back()}
                        className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Calendar
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-8">Booking Summary</h1>

                        <div className="space-y-6 mb-8">
                            {selectedRooms.map((room) => (
                                <div key={room.id} className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="font-semibold text-lg mb-4">Room {room.id}</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <span className="text-gray-600 text-sm">Time Slot:</span>
                                            <p className="font-medium">
                                                {room.timeSlot === 'full' ? 'Full Day (8:00 AM - 5:00 PM)' :
                                                    room.timeSlot === 'morning' ? 'Morning (8:00 AM - 12:00 PM)' :
                                                        'Evening (1:00 PM - 5:00 PM)'}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Booking Type:</span>
                                            <p className="font-medium capitalize">{bookingType}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-gray-600 text-sm">Selected Dates:</span>
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {room.dates.map((date) => (
                                                <div key={date}
                                                    className="flex justify-between items-center bg-white p-3 rounded border border-gray-200">
                                                    <span className="text-sm">{formatDate(date)}</span>
                                                    {bookingType === 'daily' && (
                                                        <button
                                                            onClick={() => handleRemoveDate(room.id, date)}
                                                            className="text-red-500 hover:text-red-700 ml-2"
                                                            title="Remove date"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 pt-6 mb-8">
                            <h2 className="text-xl font-semibold mb-4">Price Breakdown</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${priceBreakdown.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax (3.5%)</span>
                                    <span>${priceBreakdown.tax.toFixed(2)}</span>
                                </div>
                                {!session?.user?.isMembershipActive && (
                                    <div className="flex justify-between text-gray-600">
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <span>Security Deposit</span>
                                                <div className="ml-2 group relative">
                                                    <svg className="w-4 h-4 text-gray-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                                                        Security deposit is only charged for your first booking. It will be refunded according to our policy.
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-blue-600 font-medium">First Booking Only - Refundable</div>
                                        </div>
                                        <span>${priceBreakdown.securityDeposit.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between font-semibold">
                                        <span>Total</span>
                                        <span className="text-blue-600">${priceBreakdown.total.toFixed(2)}</span>
                                    </div>
                                    {!session?.user?.isMembershipActive && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            *Security deposit of $250 is included in the total as this is your first booking
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Terms and Conditions Section */}
                        <div className="border-t border-gray-200 pt-6 mb-8">
                            <h2 className="text-xl font-semibold mb-4">Terms and Conditions</h2>
                            <div className="space-y-3 text-sm text-gray-700 mb-6">
                                <p className="mb-2">• Payments are non-refundable. Only the security deposit is refundable as per policy.</p>
                                <p className="mb-2">• Renters are responsible for the equipment and space during their booked time slot.</p>
                                <p className="mb-2">• Clinic owners must maintain a safe and professional environment.</p>
                                <p className="mb-2">• Renters must respect booking times. If a renter arrives late, extra time will not be provided or compensated.</p>
                                <p className="mb-2">• Any damages or misuse of the clinic will be deducted from the security deposit.</p>
                                <p className="mb-2">• All users must follow platform policies regarding cancellations and conduct.</p>
                            </div>

                            {/* Terms Acceptance Checkbox */}
                            <div className="flex items-start space-x-3 mb-6">
                                <input
                                    type="checkbox"
                                    id="acceptTerms"
                                    checked={acceptedTerms}
                                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                                    By confirming this booking, I acknowledge that I have read and agree to all the above Terms and Conditions.
                                </label>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleProceedToPayment}
                                disabled={isProcessing || !acceptedTerms}
                                className={`w-full flex items-center justify-center py-4 px-6 rounded-lg text-white font-medium 
                                    ${(isProcessing || !acceptedTerms) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} 
                                    transition-colors duration-200`}
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    'Proceed to Payment'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SummaryPage; 