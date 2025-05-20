'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Header from '@/components/Header';
import VerificationStatus from '@/components/VerificationStatus';

type TimeSlot = 'full' | 'morning' | 'evening';

interface Room {
    id: number;
    name: string;
    image: string;
    description: string;
    selected: boolean;
    timeSlot: TimeSlot;
}

const BookingPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [selectedOption, setSelectedOption] = useState<'daily' | 'monthly'>('daily');
    const [isInitialized, setIsInitialized] = useState(false);
    const [rooms, setRooms] = useState<Room[]>([
        {
            id: 1,
            name: 'Room 1',
            image: '/images/room1.png',
            description: 'Spacious consultation room with modern medical equipment',
            selected: false,
            timeSlot: 'full'
        },
        {
            id: 2,
            name: 'Room 2',
            image: '/images/room2.png',
            description: 'Well-lit examination room with patient comfort in mind',
            selected: false,
            timeSlot: 'full'
        },
        {
            id: 3,
            name: 'Room 3',
            image: '/images/room3.png',
            description: 'Private consultation space with state-of-the-art facilities',
            selected: false,
            timeSlot: 'full'
        }
    ]);

    // Initialize page and handle authentication
    useEffect(() => {
        const initializePage = async () => {
            try {
                // Only clear booking data if we're starting a new booking
                const currentPath = window.location.pathname;
                if (currentPath === '/booking') {
                    console.log('Starting new booking - clearing old data');
                    sessionStorage.removeItem('selectedRooms');
                    sessionStorage.removeItem('bookingType');
                    sessionStorage.removeItem('bookingData');
                    sessionStorage.removeItem('paymentIntent');
                }
                
                setIsInitialized(true);
            } catch (error) {
                console.error('Error initializing page:', error);
                toast.error('Failed to initialize booking page');
            }
        };

        if (status === 'authenticated') {
            initializePage();
        } else if (status === 'unauthenticated') {
            console.log('User is not authenticated, redirecting to login...');
            router.push('/login?callbackUrl=/booking');
        }
    }, [status, router]);

    // Show loading state while checking authentication or initializing
    if (status === 'loading' || !isInitialized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // If not authenticated, show a message instead of immediately redirecting
    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Please Log In</h2>
                    <p className="text-gray-600 mb-6">You need to be logged in to access the booking page.</p>
                    <button
                        onClick={() => router.push('/login?callbackUrl=/booking')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Log In
                    </button>
                </div>
            </div>
        );
    }

    // Rest of your component code...
    const handleRoomSelect = (roomId: number) => {
        setRooms(rooms.map(room => {
            if (room.id === roomId) {
                const newSelected = !room.selected;
                toast.success(`${room.name} ${newSelected ? 'selected' : 'unselected'}`);
                return { ...room, selected: newSelected };
            }
            return room;
        }));
    };

    const handleBookingTypeChange = (type: 'daily' | 'monthly') => {
        setSelectedOption(type);
        toast.success(`Switched to ${type} booking`);
    };

    const handleTimeSlotChange = (roomId: number, timeSlot: TimeSlot) => {
        setRooms(rooms.map(room => {
            if (room.id === roomId) {
                toast.success(`${room.name} time slot updated to ${timeSlot === 'full' ? 'Full Day' : timeSlot === 'morning' ? 'Morning' : 'Evening'}`);
                return { ...room, timeSlot };
            }
            return room;
        }));
    };

    const handleContinue = () => {
        const selectedRooms = rooms.filter(r => r.selected);
        
        console.log('Selected rooms before proceeding:', selectedRooms);
        
        if (selectedRooms.length === 0) {
            toast.error('Please select at least one room');
            return;
        }

        try {
            // Prepare the room data with proper initialization
            const roomsWithDates = selectedRooms.map(room => ({
                id: room.id,
                name: room.name,
                image: room.image,
                description: room.description,
                selected: true,
                timeSlot: room.timeSlot,
                dates: [] // Initialize empty dates array
            }));

            // Log data being stored
            console.log('Storing data:', {
                bookingType: selectedOption,
                rooms: roomsWithDates
            });

            // Store booking data
            sessionStorage.setItem('selectedRooms', JSON.stringify(roomsWithDates));
            sessionStorage.setItem('bookingType', selectedOption);

            // Verify data was stored correctly
            const storedRooms = sessionStorage.getItem('selectedRooms');
            const storedType = sessionStorage.getItem('bookingType');

            if (!storedRooms || !storedType) {
                throw new Error('Failed to store booking data');
            }

            // Verify stored data can be parsed
            const parsedRooms = JSON.parse(storedRooms);
            if (!Array.isArray(parsedRooms) || parsedRooms.length === 0) {
                throw new Error('Invalid stored room data');
            }

            toast.success('Proceeding to calendar...');
            router.push('/booking/calendar');
        } catch (error) {
            console.error('Error preparing booking data:', error);
            toast.error('Error preparing booking data. Please try again.');
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            <header className="sticky top-0 left-0 right-0 z-50 bg-white shadow-md">
                <Header />
                <div className="container mx-auto px-4 mt-6">
                    <div className="max-w-6xl mx-auto">
                        <button
                            onClick={handleBack}
                            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <VerificationStatus />
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold text-gray-800 mb-4">Book Your Space</h1>
                        <p className="text-xl text-gray-600">Choose your preferred booking option and room(s)</p>
                    </div>

                    {/* Booking Type Selection */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-semibold mb-8 text-gray-800">Select Booking Type</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => handleBookingTypeChange('daily')}
                                className={`p-8 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                    selectedOption === 'daily'
                                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                                }`}
                            >
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-xl mb-3">Daily Booking</h3>
                                    <p className="text-gray-600 text-center mb-4">Perfect for one-time appointments</p>
                                    <div className="text-blue-600 font-bold">
                                        Full Day: $300/room/day<br />
                                        Half Day: $160/room/day
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleBookingTypeChange('monthly')}
                                className={`p-8 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                                    selectedOption === 'monthly'
                                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                                }`}
                            >
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-xl mb-3">Monthly Booking</h3>
                                    <p className="text-gray-600 text-center mb-4">Full month access</p>
                                    <div className="text-blue-600 font-bold">
                                        Full Day: $2000/room/month<br />
                                        Half Day: $1200/room/month
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Room Selection */}
                    <div className="mb-16">
                        <h2 className="text-3xl font-semibold mb-8 text-gray-800">Select Room(s)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {rooms.map(room => (
                                <div key={room.id} className="relative rounded-xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105">
                                    <div
                                        onClick={() => handleRoomSelect(room.id)}
                                        className={`cursor-pointer ${
                                            room.selected
                                                ? 'border-4 border-blue-500 shadow-lg'
                                                : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="aspect-w-16 aspect-h-9">
                                            <img
                                                src={room.image}
                                                alt={room.name}
                                                className="object-cover w-full h-full"
                                            />
                                            {room.selected && (
                                                <div className="absolute top-4 right-4 bg-blue-500 text-white p-2 rounded-full">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <h3 className="text-xl font-semibold mb-2">{room.name}</h3>
                                            <p className="text-gray-600">{room.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <button
                            onClick={handleContinue}
                            className="bg-blue-600 text-white px-12 py-4 rounded-xl text-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            Continue to Calendar
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BookingPage; 