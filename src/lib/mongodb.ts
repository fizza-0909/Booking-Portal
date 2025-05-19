import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    retryReads: true,
    connectTimeoutMS: 10000,
};

declare global {
    var _mongoClientPromise: Promise<MongoClient>;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function connectToDatabase() {
    try {
        const connectedClient = await clientPromise;
        return { db: connectedClient.db(), client: connectedClient };
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

// Handle cleanup on app termination
process.on('SIGINT', async () => {
    try {
        if (client) {
            await client.close();
            console.log('MongoDB connection closed through app termination');
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    } finally {
        process.exit(0);
    }
});
