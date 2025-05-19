'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';

export default function Home() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow flex flex-col items-center justify-center bg-gray-50 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                        HIRE A CLINIC Booking  Portal
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Book medical clinic rooms for your practice with ease
                    </p>
                    <div className="space-x-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50"
                        >
                            Create Account
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
} 