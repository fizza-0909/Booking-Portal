'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const PricingPage = () => {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 pt-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-gray-600">Choose the perfect plan for your medical space needs</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Daily Booking Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Daily Booking</h3>
                        <div className="text-4xl font-bold text-blue-600 mb-6">
                            $150<span className="text-lg text-gray-500">/day</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Full day access (8 AM - 5 PM)
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                All utilities included
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Basic equipment access
                            </li>
                        </ul>
                        <button
                            onClick={() => router.push('/booking')}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Book Now
                        </button>
                    </div>

                    {/* Half Day Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Half Day</h3>
                        <div className="text-4xl font-bold text-blue-600 mb-6">
                            $80<span className="text-lg text-gray-500">/half-day</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Morning (8 AM - 12 PM) or Evening (1 PM - 5 PM)
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                All utilities included
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Basic equipment access
                            </li>
                        </ul>
                        <button
                            onClick={() => router.push('/booking')}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Book Now
                        </button>
                    </div>

                    {/* Monthly Booking Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-500">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 rounded-bl-lg text-sm">
                            Best Value
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Monthly Booking</h3>
                        <div className="text-4xl font-bold text-blue-600 mb-6">
                            $2500<span className="text-lg text-gray-500">/month</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Full month access
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Priority booking
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                All utilities included
                            </li>
                            <li className="flex items-center">
                                <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Full equipment access
                            </li>
                        </ul>
                        <button
                            onClick={() => router.push('/booking')}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Book Now
                        </button>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Additional Information</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-6 bg-white rounded-xl shadow-md">
                            <h3 className="font-semibold mb-2">Security Deposit</h3>
                            <p className="text-gray-600">$250 refundable security deposit required for all bookings</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-md">
                            <h3 className="font-semibold mb-2">Cancellation Policy</h3>
                            <p className="text-gray-600">Free cancellation up to 48 hours before booking</p>
                        </div>
                        <div className="p-6 bg-white rounded-xl shadow-md">
                            <h3 className="font-semibold mb-2">Equipment Access</h3>
                            <p className="text-gray-600">Additional equipment available for rent</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingPage; 