import { Schema, model, models } from 'mongoose';
import { TimeSlot, BookingType } from '@/constants/pricing';

const bookingSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rooms: [{
        roomId: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        timeSlot: {
            type: String,
            enum: ['full', 'morning', 'evening'],
            required: true
        },
        dates: [{
            date: {
                type: String,
                required: true
            },
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            }
        }]
    }],
    bookingType: {
        type: String,
        enum: ['daily', 'monthly'],
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'failed'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'succeeded', 'failed'],
        default: 'pending'
    },
    paymentIntentId: {
        type: String,
        sparse: true
    },
    stripeCustomerId: {
        type: String,
        sparse: true
    },
    paymentDetails: {
        status: String,
        confirmedAt: Date,
        failedAt: Date,
        failureMessage: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Add indexes for common queries
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ paymentIntentId: 1 });

// Validate dates don't overlap for same room and time slot
bookingSchema.pre('save', async function (next) {
    try {
        // Check each room in the booking
        for (const room of this.rooms) {
            const existingBooking = await this.constructor.findOne({
                _id: { $ne: this._id },
                'rooms': {
                    $elemMatch: {
                        'roomId': room.roomId,
                        'timeSlot': room.timeSlot,
                        'dates.date': {
                            $in: room.dates.map(d => d.date)
                        }
                    }
                },
                'status': { $in: ['pending', 'confirmed'] }
            });

            if (existingBooking) {
                throw new Error(`Room ${room.name} is already booked for some of the selected dates and time slot`);
            }
        }
        next();
    } catch (error) {
        next(error);
    }
});

export const Booking = models.Booking || model('Booking', bookingSchema);
export default Booking; 