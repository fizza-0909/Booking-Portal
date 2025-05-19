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
                required: true,
                validate: {
                    validator: function(v: string) {
                        const date = new Date(v);
                        return !isNaN(date.getTime());
                    },
                    message: props => `${props.value} is not a valid date`
                }
            },
            startTime: {
                type: String,
                required: true,
                validate: {
                    validator: function(v: string) {
                        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                    },
                    message: props => `${props.value} is not a valid time format (HH:MM)`
                }
            },
            endTime: {
                type: String,
                required: true,
                validate: {
                    validator: function(v: string) {
                        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
                    },
                    message: props => `${props.value} is not a valid time format (HH:MM)`
                }
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
        required: true,
        min: [0, 'Total amount cannot be negative']
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
        sparse: true,
        index: true
    },
    stripeCustomerId: {
        type: String,
        sparse: true
    },
    paymentDetails: {
        status: String,
        confirmedAt: Date,
        failedAt: Date,
        failureMessage: String,
        amount: Number,
        currency: String,
        paymentMethodType: String
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
bookingSchema.index({ 'rooms.roomId': 1, 'rooms.dates.date': 1 });

// Validate dates don't overlap for same room and time slot
bookingSchema.pre('save', async function (next) {
    try {
        // Check each room in the booking
        for (const room of this.rooms) {
            // Validate dates are in chronological order
            const dates = room.dates.map(d => new Date(d.date));
            for (let i = 1; i < dates.length; i++) {
                if (dates[i] < dates[i-1]) {
                    throw new Error(`Dates for room ${room.name} must be in chronological order`);
                }
            }

            // Check for overlapping bookings
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

// Add method to check if booking is active
bookingSchema.methods.isActive = function() {
    return this.status === 'confirmed' && this.paymentStatus === 'succeeded';
};

// Add method to get booking duration in days
bookingSchema.methods.getDuration = function() {
    if (!this.rooms.length || !this.rooms[0].dates.length) return 0;
    const dates = this.rooms[0].dates.map(d => new Date(d.date));
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

export const Booking = models.Booking || model('Booking', bookingSchema);
export default Booking; 