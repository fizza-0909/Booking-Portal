import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Room name is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Room description is required'],
        trim: true
    },
    price: {
        fullDay: {
            type: Number,
            required: [true, 'Full day price is required'],
            min: [0, 'Price cannot be negative']
        },
        halfDay: {
            type: Number,
            required: [true, 'Half day price is required'],
            min: [0, 'Price cannot be negative']
        }
    },
    capacity: {
        type: Number,
        required: [true, 'Room capacity is required'],
        min: [1, 'Capacity must be at least 1']
    },
    amenities: [{
        type: String,
        trim: true
    }],
    images: [{
        url: {
            type: String,
            required: true
        },
        alt: {
            type: String,
            required: true
        }
    }],
    isAvailable: {
        type: Boolean,
        default: true
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
roomSchema.index({ isAvailable: 1 });
roomSchema.index({ 'price.fullDay': 1, 'price.halfDay': 1 });

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema); 