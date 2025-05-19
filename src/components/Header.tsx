'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

const Header: React.FC = () => {
    const router = useRouter();
    const { data: session } = useSession();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push('/');
    };

    if (!session) {
        return null;
    }

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold text-blue-600">Hire a Clinic</span>
                        </Link>
                    </div>

                    <div className="flex items-center">
                        <nav className="hidden md:flex space-x-8 mr-8">
                            <Link href="/booking" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                                Book Now
                            </Link>
                            <Link href="/booking/My-Booking" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                                My-Booking
                            </Link>

                        </nav>

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center space-x-3 hover:bg-gray-50 rounded-full p-2 transition-colors duration-200"
                            >
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-lg">

                                        {session.user.name?.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-700 mr-2">{session.user.name}</span>
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.user.isVerified
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        }`}>
                                        {session.user.isVerified ? 'Verified' : 'Unverified'}
                                    </div>
                                </div>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-gray-900">
                                                {session.user.name}
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${session.user.isVerified
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                }`}>
                                                {session.user.isVerified ? 'Verified' : 'Unverified'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {session.user.email}
                                        </div>
                                        {!session.user.isVerified && (
                                            <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                                                Complete your first booking to get verified
                                            </div>
                                        )}
                                    </div>

                                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                        Profile Settings
                                    </Link>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header; 