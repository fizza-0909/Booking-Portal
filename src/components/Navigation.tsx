'use client';

import Link from 'next/link';
import { useState } from 'react';

const Navigation = () => {
    return (
        <nav className="bg-white">
            <div className="container mx-auto px-4">
                <div className="flex items-center h-16">
                    <Link href="/" className="text-2xl font-bold text-blue-600">
                        Hire a Clinic
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navigation; 