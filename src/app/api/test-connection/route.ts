import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        // Try to connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        // Get connection status
        const readyState = mongoose.connection.readyState;
        const status = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
            99: 'uninitialized'
        }[readyState];

        return NextResponse.json({
            status: 'success',
            connection: status,
            database: mongoose.connection.db.databaseName,
            host: mongoose.connection.host
        });
    } catch (error) {
        console.error('MongoDB connection test failed:', error);
        return NextResponse.json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
        }, { status: 500 });
    }
} 