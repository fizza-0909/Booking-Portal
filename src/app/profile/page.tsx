'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface UserProfile {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string;
    isVerified?: boolean;
    preferences?: {
        emailNotifications: boolean;
    };
}

const ProfilePage = () => {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: ''
    });
    const [profile, setProfile] = useState<UserProfile>({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        isVerified: false,
        preferences: {
            emailNotifications: true
        }
    });

    useEffect(() => {
        const fetchProfile = async () => {
            if (status === 'unauthenticated') {
                toast.error('Please login to view your profile');
                router.push('/login');
                return;
            }

            if (status === 'authenticated') {
                try {
                    const response = await fetch('/api/user/profile');
                    if (!response.ok) {
                        throw new Error('Failed to fetch profile');
                    }
                    const data = await response.json();
                    setProfile(data);
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    toast.error('Error loading profile data');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();
    }, [status, router]);

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target;

        if (name === 'preferences.emailNotifications') {
            setProfile(prev => ({
                ...prev,
                preferences: {
                    ...prev.preferences,
                    emailNotifications: (e.target as HTMLInputElement).checked
                }
            }));
        } else {
            setProfile(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profile),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();
            setProfile(updatedProfile);
            setIsEditing(false);

            // Update the session with new name
            await update({
                ...session,
                user: {
                    ...session?.user,
                    name: `${updatedProfile.firstName} ${updatedProfile.lastName}`,
                    firstName: updatedProfile.firstName,
                    lastName: updatedProfile.lastName
                }
            });

            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to save profile changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword) {
            toast.error('Please fill in both current and new password');
            return;
        }

        try {
            const response = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(passwordData),
            });

            if (!response.ok) {
                throw new Error('Failed to change password');
            }

            toast.success('Password updated successfully');
            setPasswordData({
                currentPassword: '',
                newPassword: ''
            });
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error('Failed to update password');
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
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back
                    </button>

                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                                        <div className="mt-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${profile.isVerified
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {profile.isVerified ? (
                                                    <>
                                                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Verified User
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        Unverified - Complete a booking with security deposit to get verified
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                        disabled={isSaving}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium ${isEditing
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Edit Profile'}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={profile.firstName}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className={`w-full px-4 py-2 rounded-lg border ${isEditing
                                                ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={profile.lastName}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className={`w-full px-4 py-2 rounded-lg border ${isEditing
                                                ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={profile.email}
                                            disabled={true}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            name="phoneNumber"
                                            value={profile.phoneNumber || ''}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className={`w-full px-4 py-2 rounded-lg border ${isEditing
                                                ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                                                : 'border-gray-200 bg-gray-50'
                                                }`}
                                            placeholder="Enter your phone number"
                                        />
                                    </div>
                                </div>

                                {/* Password Change Section */}
                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Current Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => setPasswordData(prev => ({
                                                        ...prev,
                                                        currentPassword: e.target.value
                                                    }))}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                                >
                                                    {showPassword ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData(prev => ({
                                                        ...prev,
                                                        newPassword: e.target.value
                                                    }))}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                                >
                                                    {showNewPassword ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handlePasswordChange}
                                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </div>

                                {/* Notification Preferences */}
                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="emailNotifications"
                                            name="preferences.emailNotifications"
                                            checked={profile.preferences?.emailNotifications ?? true}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label
                                            htmlFor="emailNotifications"
                                            className={`ml-2 text-sm text-gray-700 ${isEditing ? 'cursor-pointer' : ''}`}
                                        >
                                            Receive email notifications for bookings and updates
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage; 