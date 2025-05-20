import { Schema, model, models, Model, Document, CallbackError } from 'mongoose';

interface IDate {
    date: string;
    startTime: string;
    endTime: string;
}

interface IRoom {
    roomId: string;
    name: string;
    timeSlot: 'morning' | 'evening' | 'full';
    dates: IDate[];
}

interface IBooking extends Document {
    userId: string;
    rooms: IRoom[];
    bookingType: 'daily' | 'monthly';
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
    paymentStatus: 'pending' | 'succeeded' | 'failed';
    paymentIntentId?: string;
    stripeCustomerId?: string;
    paymentDetails?: {
        status: string;
        confirmedAt?: Date;
        updatedAt?: Date;
        amount?: number;
        currency?: string;
        paymentMethodType?: string;
        error?: {
            message?: string;
            code?: string;
            decline_code?: string;
        };
    };
    isMembershipActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    getDuration(): number;
}

const dateSchema = new Schema({
    date: {
        type: String,
        required: [true, 'Date is required'],
        match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
    },
    endTime: {
        type: String,
        required: [true, 'End time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
    }
});

const roomSchema = new Schema({
    roomId: {
        type: String,
        required: [true, 'Room ID is required'],
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true
    },
    timeSlot: {
        type: String,
        enum: ['morning', 'evening', 'full'],
        required: [true, 'Time slot is required']
    },
    dates: {
        type: [dateSchema],
        required: [true, 'Dates are required'],
        validate: {
            validator: function(dates: any[]) {
                return dates && dates.length > 0;
            },
            message: 'At least one date is required'
        }
    }
});

// Add pre-save middleware to validate dates
roomSchema.pre('save', function(next) {
    if (this.dates) {
        for (const date of this.dates) {
            if (!date.date || !date.startTime || !date.endTime) {
                next(new Error('Each date must have date, startTime, and endTime'));
                return;
            }
            
            // Validate date format (YYYY-MM-DD)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date.date)) {
                next(new Error('Date must be in YYYY-MM-DD format'));
                return;
            }

            // Validate time format (HH:MM)
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(date.startTime) ||
                !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(date.endTime)) {
                next(new Error('Time must be in HH:MM format'));
                return;
            }
        }
    }
    next();
});

const bookingSchema = new Schema({
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },
    rooms: {
        type: [roomSchema],
        required: [true, 'Rooms are required'],
        validate: {
            validator: function(rooms: any[]) {
                return rooms && rooms.length > 0;
            },
            message: 'At least one room is required'
        }
    },
    bookingType: {
        type: String,
        enum: ['daily', 'monthly'],
        required: [true, 'Booking type is required']
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
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
        sparse: true
    },
    stripeCustomerId: {
        type: String,
        sparse: true
    },
    paymentDetails: {
        status: String,
        confirmedAt: Date,
        updatedAt: Date,
        amount: Number,
        currency: String,
        paymentMethodType: String,
        error: {
            message: String,
            code: String,
            decline_code: String
        }
    },
    isMembershipActive: {
        type: Boolean,
        default: false
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
bookingSchema.index({ paymentIntentId: 1 }, { sparse: true, unique: true });

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
bookingSchema.methods.isActive = function(this: IBooking) {
    return this.status === 'confirmed' && this.paymentStatus === 'succeeded';
};

// Add method to get booking duration in days
bookingSchema.methods.getDuration = function(this: IBooking) {
    if (!this.rooms.length || !this.rooms[0].dates.length) return 0;
    const dates = this.rooms[0].dates.map((d: IDate) => new Date(d.date));
    const start = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
};

const Booking: Model<IBooking> = models.Booking || model<IBooking>('Booking', bookingSchema);
export default Booking; 