import mongoose from 'mongoose';
import { env } from '../config/env';
import logger from './logger';

// Singleton Mongoose connection.
// Falls back to a direct (non-SRV) connection string when Node's internal
// DNS resolver can't resolve the mongodb+srv:// SRV record — a common issue
// on Windows when the system DNS works but Node's resolver is restricted.
//
// Cluster shard hosts resolved via nslookup:
//   ac-oyga0ew-shard-00-00.9wpmju7.mongodb.net:27017
//   ac-oyga0ew-shard-00-01.9wpmju7.mongodb.net:27017
//   ac-oyga0ew-shard-00-02.9wpmju7.mongodb.net:27017
// Replica set name (from TXT record): atlas-dn7pu0-shard-0

let isConnected = false;

const SHARD_HOSTS = [
    'ac-oyga0ew-shard-00-00.9wpmju7.mongodb.net:27017',
    'ac-oyga0ew-shard-00-01.9wpmju7.mongodb.net:27017',
    'ac-oyga0ew-shard-00-02.9wpmju7.mongodb.net:27017',
].join(',');

const REPLICA_SET = 'atlas-dn7pu0-shard-0';

function buildDirectUri(srvUri: string): string {
    if (!srvUri.startsWith('mongodb+srv://')) return srvUri;

    const match = srvUri.match(/^mongodb\+srv:\/\/([^@]+)@[^/]+(\/[^?]*)?(\?.*)?$/);
    if (!match) return srvUri;

    const credentials = match[1];
    const dbPart = (match[2] ?? '/job-hunter').replace(/^\//, '') || 'job-hunter';

    return (
        `mongodb://${credentials}@${SHARD_HOSTS}/${dbPart}` +
        `?ssl=true&authSource=admin&replicaSet=${REPLICA_SET}&retryWrites=true&w=majority`
    );
}

export async function connectDB(): Promise<void> {
    if (isConnected) return;

    mongoose.set('strictQuery', true);

    // Attempt 1: SRV URI (works when Node DNS can resolve it)
    try {
        await mongoose.connect(env.mongodbUri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            family: 4,
        });
        isConnected = true;
        logger.info('MongoDB connected successfully (SRV).');
    } catch (srvErr) {
        const msg = srvErr instanceof Error ? srvErr.message : '';
        const isSrvFailure =
            msg.includes('querySrv') ||
            msg.includes('ECONNREFUSED') ||
            msg.includes('ENOTFOUND') ||
            msg.includes('ETIMEOUT');

        if (!isSrvFailure) throw srvErr;

        // Attempt 2: Direct connection using pre-resolved shard hosts
        logger.warn('SRV DNS lookup failed — retrying with direct shard connection...');
        const directUri = buildDirectUri(env.mongodbUri);

        await mongoose.connect(directUri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            family: 4,
        });
        isConnected = true;
        logger.info('MongoDB connected successfully (direct).');
    }

    mongoose.connection.on('disconnected', () => {
        isConnected = false;
        logger.warn('MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
    });
}

export async function disconnectDB(): Promise<void> {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected gracefully.');
}

export default mongoose;
