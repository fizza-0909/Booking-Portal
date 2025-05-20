import React from 'react';
import { useSession } from 'next-auth/react';

const VerificationStatus: React.FC = () => {
    const { data: session } = useSession();
    const isVerified = session?.user?.isMembershipActive;

    if (isVerified) {
        return (
            <div className={`p-4 rounded-lg mb-6 bg-green-50`}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className={`text-lg font-medium text-green-800`}>
                            Verified User
                        </h3>
                        <div className={`mt-2 text-sm text-green-700`}>
                            <p>
                                Your account is verified. You can make bookings without security deposit.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    } else {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                            Activate Membership
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                            <p>
                                Complete your first booking with a security deposit of $250 to activate your membership. Once activated, future bookings will not require a security deposit.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
};

export default VerificationStatus; 