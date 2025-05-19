import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Make this route public by exporting a config object
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    try {
        console.log('Testing database connection...');

        const { db } = await connectToDatabase();

        // Try to list collections as a connection test
        const collections = await db.listCollections().toArray();

        return NextResponse.json({
            status: 'success',
            message: 'Successfully connected to MongoDB',
            collections: collections.map(col => col.name)
        });
    } catch (error: any) {
        console.error('Database test failed:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        });

        return NextResponse.json({
            status: 'error',
            message: error.message,
            error: {
                name: error.name,
                code: error.code
            }
        }, { status: 500 });
    }
} 