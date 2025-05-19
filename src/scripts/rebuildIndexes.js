const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// Parse environment variables
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim().replace(/["']/g, '');
    }
});

const MONGODB_URI = envVars.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
}

async function rebuildIndexes() {
    const client = new MongoClient(MONGODB_URI, {
        retryWrites: true,
        w: 'majority'
    });

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db();
        const collection = db.collection('bookings');

        // Drop all existing indexes
        console.log('Dropping all existing indexes...');
        await collection.dropIndexes();

        // Create new indexes
        console.log('Creating new indexes...');
        await collection.createIndex({ userId: 1, status: 1 });
        await collection.createIndex({ paymentIntentId: 1 });

        // List all indexes to verify
        const indexes = await collection.listIndexes().toArray();
        console.log('Current indexes:', indexes);

        console.log('Successfully rebuilt indexes');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

rebuildIndexes(); 