require('dotenv').config();
const { MongoClient } = require('mongodb');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fixPaymentStatuses() {
    const mongoClient = new MongoClient(process.env.MONGODB_URI);
    
    try {
        await mongoClient.connect();
        const db = mongoClient.db();
        console.log('Connected to MongoDB');

        // Get all bookings with potentially inconsistent payment statuses
        const bookings = await db.collection('bookings').find({
            $or: [
                { paymentStatus: { $exists: false } },
                { paymentStatus: 'completed' },
                { paymentStatus: 'rejected' },
                { 'paymentDetails.status': { $exists: false } },
                { 'paymentDetails.status': 'completed' },
                { 'paymentDetails.status': 'rejected' },
                {
                    $and: [
                        { paymentStatus: { $exists: true } },
                        { 'paymentDetails.status': { $exists: true } },
                        { $expr: { $ne: ['$paymentStatus', '$paymentDetails.status'] } }
                    ]
                }
            ]
        }).toArray();

        console.log(`Found ${bookings.length} bookings to fix`);

        for (const booking of bookings) {
            try {
                let paymentStatus = 'pending';
                let paymentDetails = booking.paymentDetails || {};

                // If we have a payment intent ID, verify with Stripe
                if (paymentDetails.paymentIntentId) {
                    try {
                        const paymentIntent = await stripe.paymentIntents.retrieve(
                            paymentDetails.paymentIntentId
                        );
                        
                        if (paymentIntent.status === 'succeeded') {
                            paymentStatus = 'succeeded';
                            paymentDetails = {
                                ...paymentDetails,
                                status: 'succeeded',
                                confirmedAt: paymentDetails.confirmedAt || new Date(),
                                amount: paymentIntent.amount,
                                currency: paymentIntent.currency,
                                paymentMethodType: paymentIntent.payment_method_types?.[0] || 'card'
                            };
                        } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
                            paymentStatus = 'failed';
                            paymentDetails = {
                                ...paymentDetails,
                                status: 'failed',
                                error: {
                                    message: paymentIntent.last_payment_error?.message || 'Payment was not successful',
                                    code: paymentIntent.last_payment_error?.code,
                                    decline_code: paymentIntent.last_payment_error?.decline_code
                                }
                            };
                        }
                    } catch (stripeError) {
                        console.error(`Error retrieving payment intent for booking ${booking._id}:`, stripeError.message);
                    }
                } else {
                    // No payment intent ID, determine status from existing data
                    if (booking.paymentStatus === 'completed' || booking.paymentStatus === 'succeeded' ||
                        paymentDetails.status === 'completed' || paymentDetails.status === 'succeeded') {
                        paymentStatus = 'succeeded';
                        paymentDetails.status = 'succeeded';
                    } else if (booking.paymentStatus === 'rejected' || booking.paymentStatus === 'failed' ||
                             paymentDetails.status === 'rejected' || paymentDetails.status === 'failed') {
                        paymentStatus = 'failed';
                        paymentDetails.status = 'failed';
                    }
                }

                // Update the booking with consistent status
                await db.collection('bookings').updateOne(
                    { _id: booking._id },
                    {
                        $set: {
                            paymentStatus,
                            paymentDetails,
                            updatedAt: new Date()
                        }
                    }
                );

                console.log(`Fixed booking ${booking._id}: ${paymentStatus}`);
            } catch (error) {
                console.error(`Error fixing booking ${booking._id}:`, error.message);
            }
        }

        console.log('Fix completed');
    } catch (error) {
        console.error('Fix error:', error);
    } finally {
        await mongoClient.close();
    }
}

fixPaymentStatuses().catch(console.error); 