require('dotenv').config();
const { MongoClient } = require('mongodb');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function syncPaymentStatuses() {
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await mongoClient.connect();
        const db = mongoClient.db();
        console.log('Connected to MongoDB');

        // Get all bookings with rejected payment status
        const bookings = await db.collection('bookings').find({
            $or: [
                { status: 'pending' },
                { status: 'failed' },
                { 'paymentDetails.status': { $ne: 'succeeded' } }
            ]
        }).toArray();

        console.log(`Found ${bookings.length} bookings to check`);

        for (const booking of bookings) {
            if (!booking.paymentDetails?.paymentIntentId) {
                console.log(`Booking ${booking._id} has no payment intent ID, skipping`);
                continue;
            }

            try {
                // Get payment intent from Stripe
                const paymentIntent = await stripe.paymentIntents.retrieve(
                    booking.paymentDetails.paymentIntentId
                );

                if (paymentIntent.status === 'succeeded') {
                    // Update booking status
                    await db.collection('bookings').updateOne(
                        { _id: booking._id },
                        {
                            $set: {
                                status: 'confirmed',
                                'paymentDetails.status': 'succeeded',
                                'paymentDetails.confirmedAt': new Date(),
                                updatedAt: new Date()
                            }
                        }
                    );
                    console.log(`Updated booking ${booking._id} to succeeded status`);
                }
            } catch (error) {
                console.error(`Error processing booking ${booking._id}:`, error.message);
            }
        }

        console.log('Sync completed');
    } catch (error) {
        console.error('Sync error:', error);
    } finally {
        await mongoClient.close();
    }
}

syncPaymentStatuses().catch(console.error); 