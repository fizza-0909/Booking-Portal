// Price calculation utility for bookings
import { TimeSlot, BookingType } from '@/constants/pricing';

export interface RoomForPrice {
  id: number;
  timeSlot: TimeSlot;
  dates: string[];
}

export interface PriceBreakdown {
  subtotal: number;
  tax: number;
  securityDeposit: number;
  total: number;
}

export function calculatePrice(
  rooms: RoomForPrice[],
  bookingType: BookingType,
  isMembershipActive: boolean
): PriceBreakdown {
  let subtotal = 0;
  const fullDayPrice = 300;
  const halfDayPrice = 160;
  const monthlyFullDayPrice = 2000;
  const monthlyHalfDayPrice = 1200;
  rooms.forEach(room => {
    const numberOfDays = room.dates?.length || 0;
    if (numberOfDays === 0) return; // Skip rooms with no dates selected
    if (bookingType === 'daily') {
      const basePrice = room.timeSlot === 'full' ? fullDayPrice : halfDayPrice;
      subtotal += basePrice * numberOfDays;
    } else {
      subtotal += room.timeSlot === 'full' ? monthlyFullDayPrice : monthlyHalfDayPrice;
    }
  });
  const tax = subtotal * 0.035;
  const securityDeposit = isMembershipActive ? 0 : 250;
  return {
    subtotal,
    tax,
    securityDeposit,
    total: subtotal + tax + securityDeposit
  };
} 