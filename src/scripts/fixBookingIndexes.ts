import dbConnect from '@/lib/mongoose';
import { Booking } from '@/models/Booking';

async function fixBookingIndexes() {
    try {
        console.log('Connecting to database...');
        await dbConnect();

        console.log('Dropping all indexes...');
        await Booking.collection.dropIndexes();

        console.log('Creating new indexes...');
        await Booking.collection.createIndex({ userId: 1, status: 1 });
        await Booking.collection.createIndex({ 'rooms.id': 1, 'rooms.dates': 1, 'rooms.timeSlot': 1 });
        await Booking.collection.createIndex({ paymentIntentId: 1 });

        console.log('Indexes updated successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

fixBookingIndexes(); 