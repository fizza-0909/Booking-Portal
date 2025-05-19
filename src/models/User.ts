import { Schema, model, models } from 'mongoose';
import { hash } from 'bcryptjs';

const userSchema = new Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isMembershipActive: {
        type: Boolean,
        default: false
    },
    membershipActivatedAt: {
        type: Date
    },
    membershipExpiresAt: {
        type: Date
    },
    verificationToken: {
        type: String,
        select: false
    },
    verificationTokenExpires: {
        type: Date,
        select: false
    },
    verificationCode: {
        type: String,
        select: false
    },
    verificationCodeExpires: {
        type: Date,
        select: false
    },
    stripeCustomerId: {
        type: String,
        sparse: true,  // Allows null values and creates a sparse index
        index: true
    },
    preferences: {
        emailNotifications: {
            type: Boolean,
            default: true
        },
        smsNotifications: {
            type: Boolean,
            default: false
        }
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

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        this.password = await hash(this.password, 12);
        this.updatedAt = new Date();
        next();
    } catch (error) {
        next(error as Error);
    }
});

// Create full name virtual
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Add method to check if membership is active
userSchema.methods.isMembershipValid = function() {
    if (!this.isMembershipActive) return false;
    if (!this.membershipExpiresAt) return true; // No expiration set
    return new Date() < this.membershipExpiresAt;
};

// Add method to activate membership
userSchema.methods.activateMembership = async function(durationInDays?: number) {
    this.isMembershipActive = true;
    this.membershipActivatedAt = new Date();
    
    if (durationInDays) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationInDays);
        this.membershipExpiresAt = expiresAt;
    }
    
    await this.save();
};

// Add method to deactivate membership
userSchema.methods.deactivateMembership = async function() {
    this.isMembershipActive = false;
    this.membershipExpiresAt = undefined;
    await this.save();
};

// Add indexes for common queries
userSchema.index({ email: 1 });
userSchema.index({ stripeCustomerId: 1 });
userSchema.index({ isMembershipActive: 1, membershipExpiresAt: 1 });

const User = models.User || model('User', userSchema);

export default User; 