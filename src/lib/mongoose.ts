import mongoose, { connection } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout to 45 seconds
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 5,
    retryWrites: true,
    retryReads: true,
    w: 'majority',
};

declare global {
    var mongoose: {
        promise: Promise<typeof import('mongoose')> | null;
        conn: typeof import('mongoose') | null;
    };
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        console.log('Using cached MongoDB connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const retryConnect = async (retries = 5, delay = 5000): Promise<typeof mongoose> => {
            try {
                console.log('Connecting to MongoDB...');
                const connection = await mongoose.connect(MONGODB_URI!, options);
                console.log('Successfully connected to MongoDB');
                return mongoose;
            } catch (error) {
                if (retries === 0) {
                    throw error;
                }
                console.log(`MongoDB connection failed. Retrying in ${delay / 1000} seconds... (${retries} attempts remaining)`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return retryConnect(retries - 1, delay);
            }
        };

        cached.promise = retryConnect()
            .catch((error) => {
                console.error('Failed to connect to MongoDB after all retries:', error);
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn;
}

export default dbConnect;

// Export mongoose for model definitions
export { connection }; 