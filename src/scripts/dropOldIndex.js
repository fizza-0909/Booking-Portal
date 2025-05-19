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
        envVars[key.trim()] = value.trim();
    }
});

const MONGODB_URI = envVars.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.local');
    process.exit(1);
}

async function dropOldIndex() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('hire-a-clinic');
        const collection = db.collection('bookings');

        // List all indexes first
        const indexes = await collection.listIndexes().toArray();
        console.log('Current indexes:', indexes);

        // Drop the specific problematic index if it exists
        try {
            await collection.dropIndex('roomId_1_date_1_timeSlot_1');
            console.log('Successfully dropped the old index');
        } catch (indexError) {
            if (indexError.code === 27) {
                console.log('Index does not exist, skipping...');
            } else {
                throw indexError;
            }
        }

        // List indexes after dropping
        const remainingIndexes = await collection.listIndexes().toArray();
        console.log('Remaining indexes:', remainingIndexes);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

dropOldIndex(); 