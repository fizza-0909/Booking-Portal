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
            <div className={`p-4 rounded-lg mb-6 bg-yellow-50`}>
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className={`text-lg font-medium text-yellow-800`}>
                            Unverified User
                        </h3>
                        <div className={`mt-2 text-sm text-yellow-700`}>
                            <p>
                                Complete your first booking with a security deposit of $250 per room to become a verified user.
                                Once verified, future bookings will not require a security deposit.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
};

export default VerificationStatus; 