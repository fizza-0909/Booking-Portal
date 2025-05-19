import React from 'react';
import { useSession } from 'next-auth/react';

const VerificationStatus = () => {
    const { data: session } = useSession();
    const [verificationStatus, setVerificationStatus] = React.useState<{
        isVerified: boolean;
        verifiedAt?: Date;
    } | null>(null);

    React.useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('/api/user/status');
                if (response.ok) {
                    const data = await response.json();
                    setVerificationStatus(data);
                }
            } catch (error) {
                console.error('Error fetching verification status:', error);
            }
        };

        if (session) {
            fetchStatus();
        }
    }, [session]);

    if (!session || !verificationStatus) {
        return null;
    }

    return (
        <div className={`p-4 rounded-lg mb-6 ${verificationStatus.isVerified ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-start">
                {verificationStatus.isVerified ? (
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                ) : (
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                )}
                <div className="ml-3">
                    <h3 className={`text-lg font-medium ${verificationStatus.isVerified ? 'text-green-800' : 'text-yellow-800'}`}>
                        {verificationStatus.isVerified ? 'Verified User' : 'Unverified User'}
                    </h3>
                    <div className={`mt-2 text-sm ${verificationStatus.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                        {verificationStatus.isVerified ? (
                            <p>
                                Your account is verified. You can make bookings without security deposit.
                                {verificationStatus.verifiedAt && (
                                    <span className="block mt-1 text-xs">
                                        Verified on: {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </p>
                        ) : (
                            <p>
                                Complete your first booking with a security deposit of $250 per room to become a verified user.
                                Once verified, future bookings will not require a security deposit.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationStatus; 