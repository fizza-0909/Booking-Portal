'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Portal() {
    const router = useRouter();

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (!user) {
            router.push('/');
            return;
        }
        router.push('/booking');
    }, [router]);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <p className="text-gray-600">Redirecting to booking page...</p>
            </div>
        </div>
    );
} 