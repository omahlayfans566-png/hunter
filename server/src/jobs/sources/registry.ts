import { JobSource } from '../types';
import { ArbeitnowSource } from './arbeitnow';
import { TheMuseSource } from './themuse';
import { RemotiveSource } from './remotive';
import { JobicySource } from './jobicy';
import { AdzunaSource } from './adzuna';
import { UsaJobsSource } from './usajobs';
import { GreenhouseSource } from './greenhouse';
import { LeverSource } from './lever';
import { RemoteOKSource } from './remoteok';

/**
 * Central registry of all connected job providers.
 * The ingestion engine picks them up automatically.
 *
 * Provider refresh cadence (ms):
 *  - Remotive explicitly caps usage (~4x/day) → every 6h.
 *  - RemoteOK: every 2h (they ask for reasonable usage).
 *  - Everything else → hourly (safe for the public feeds).
 */
export function getRegisteredSources(): JobSource[] {
    return [
        new ArbeitnowSource(),
        new TheMuseSource(),
        new RemotiveSource(),
        new JobicySource(),
        new RemoteOKSource(),
        new AdzunaSource(),
        new UsaJobsSource(),
        new GreenhouseSource(),
        new LeverSource(),
    ];
}

export function getSourceMinIntervalMs(sourceName: string): number {
    switch (sourceName) {
        case 'remotive':
            return 6 * 60 * 60 * 1000; // respect Remotive ~4 requests/day limit
        case 'arbeitnow':
        case 'themuse':
            return 60 * 60 * 1000; // hourly is safe for public feeds
        case 'remoteok':
        case 'jobicy':
        case 'adzuna':
        case 'usajobs':
        case 'greenhouse':
        case 'lever':
            return 2 * 60 * 60 * 1000;
        default:
            return 60 * 60 * 1000;
    }
}
