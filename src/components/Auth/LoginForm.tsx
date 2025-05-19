'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';

interface LoginFormData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}

const LoginForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        firstName: '',
        lastName: ''
    });
    const [isNewUser, setIsNewUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check for error parameter in URL
    React.useEffect(() => {
        const error = searchParams?.get('error');
        if (error) {
            toast.error(decodeURIComponent(error));
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const loadingToast = toast.loading(isNewUser ? 'Registering...' : 'Logging in...');

        try {
            if (isNewUser) {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        email: formData.email.toLowerCase()
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to register');
                }

                toast.dismiss(loadingToast);
                toast.success('Registration successful! Please log in.');
                setIsNewUser(false);
                setFormData(prev => ({
                    ...prev,
                    firstName: '',
                    lastName: '',
                    password: ''
                }));
            } else {
                const result = await signIn('credentials', {
                    email: formData.email.toLowerCase(),
                    password: formData.password,
                    redirect: false
                });

                if (result?.error) {
                    toast.dismiss(loadingToast);
                    throw new Error(result.error);
                }

                toast.dismiss(loadingToast);
                toast.success('Login successful!');

                // Get the callback URL from the search params or use default
                const callbackUrl = searchParams?.get('callbackUrl') || '/booking';
                router.push(callbackUrl);
            }
        } catch (error) {
            console.error('Form submission error:', error);
            toast.dismiss(loadingToast);
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">
                {isNewUser ? 'Register' : 'Login'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isNewUser && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">First Name</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required={isNewUser}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required={isNewUser}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {isNewUser && (
                        <p className="mt-1 text-sm text-gray-500">
                            Password must be at least 8 characters long
                        </p>
                    )}
                </div>

                <div className="flex justify-between items-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsNewUser(!isNewUser);
                            setFormData({
                                email: '',
                                password: '',
                                firstName: '',
                                lastName: ''
                            });
                        }}
                        className="text-blue-600 hover:text-blue-800"
                    >
                        {isNewUser ? 'Already have an account? Login' : 'New user? Register'}
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isNewUser ? 'Registering...' : 'Logging in...'}
                            </span>
                        ) : (
                            isNewUser ? 'Register' : 'Login'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LoginForm; 