import { MongoClient } from 'mongodb';

async function dropOldIndex() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    const client = new MongoClient(process.env.MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('hire-a-clinic');
        const collection = db.collection('bookings');

        // Drop the specific problematic index
        await collection.dropIndex('roomId_1_date_1_timeSlot_1');
        console.log('Successfully dropped the old index');

        process.exit(0);
    } catch (error) {
        console.error('Error dropping index:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

dropOldIndex(); 