import { Schema, model, models } from 'mongoose';

const bookingSummarySchema = new Schema({
  bookingId: { type: String, required: true },
  userId: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Add any other summary fields you want
});

export const BookingSummary = models.BookingSummary || model('BookingSummary', bookingSummarySchema);
export default BookingSummary; 