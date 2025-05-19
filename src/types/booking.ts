export type TimeSlot = 'full' | 'half';

export interface RoomBooking {
    roomId: string;
    selectedDates: Date[];
    timeSlot: TimeSlot;
    isMonthly: boolean;
}

export interface Room {
    id: string;
    name: string;
    type: 'exam' | 'consultation' | 'procedure' | 'office';
    booking?: RoomBooking;
}

export interface PriceBreakdown {
    subtotal: number;
    tax: number;
    securityDeposit: number;
    total: number;
}

export interface BookingFormData {
    name: string;
    email: string;
    phone: string;
    selectedRooms: Room[];
    specialRequirements: string;
}

export const PRICING = {
    daily: {
        full: 300,
        half: 160
    },
    monthly: {
        full: 2000,
        half: 1200
    },
    tax: 0.035, // 3.5%
    securityDeposit: 500
} as const; 