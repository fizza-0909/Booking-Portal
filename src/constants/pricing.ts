export const PRICING = {
    daily: {
        full: 300,    // Full day (8:00 AM - 5:00 PM)
        morning: 160, // Morning (8:00 AM - 12:00 PM)
        evening: 160  // Evening (1:00 PM - 5:00 PM)
    },
    monthly: {
        full: 2000,   // Full day (8:00 AM - 5:00 PM)
        morning: 1200, // Morning (8:00 AM - 12:00 PM)
        evening: 1200  // Evening (1:00 PM - 5:00 PM)
    },
    securityDeposit: 250, // Per room
    taxRate: 0.035 // 3.5%
} as const;

export type TimeSlot = 'full' | 'morning' | 'evening';
export type BookingType = 'daily' | 'monthly'; 