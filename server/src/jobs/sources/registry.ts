import { JobSource } from '../types';
import { ArbeitnowSource } from './arbeitnow';
import { TheMuseSource } from './themuse';
import { RemotiveSource } from './remotive';
import { JobicySource } from './jobicy';
import { RemoteOKSource } from './remoteok';
import { AfricanJobsSource } from './africanjobs';
import { JoobleSource } from './jooble';
import { AdzunaSource } from './adzuna';
import { UsaJobsSource } from './usajobs';
import { GreenhouseSource } from './greenhouse';
import { LeverSource } from './lever';

/**
 * Central registry of all connected job providers.
 * All sources are fetched CONCURRENTLY by the ingestion engine.
 *
 * Free sources (no API key required):
 *   Arbeitnow, The Muse, Remotive, Jobicy, RemoteOK,
 *   AfricanJobs (🇳🇬 Nigeria), Greenhouse, Lever
 *
 * Opt-in sources (require API keys — see .env.example):
 *   Jooble    → JOOBLE_API_KEY      (free, covers Nigeria/UK/USA/Remote)
 *   Adzuna    → ADZUNA_APP_ID + ADZUNA_APP_KEY  (16 countries)
 *   USAJobs   → USAJOBS_EMAIL + USAJOBS_KEY     (US government)
 */
export function getRegisteredSources(): JobSource[] {
    return [
        new ArbeitnowSource(),
        new TheMuseSource(),
        new RemotiveSource(),
        new JobicySource(),
        new RemoteOKSource(),
        new AfricanJobsSource(),  // 🇳🇬 Nigeria — Jobberman + MyJobMag
        new JoobleSource(),        // Global — Nigeria, UK, USA, Remote (needs key)
        new AdzunaSource(),        // 16 countries (needs key)
        new UsaJobsSource(),       // US gov (needs key)
        new GreenhouseSource(),    // 30 top tech companies
        new LeverSource(),         // 15 remote-first companies
    ];
}

export function getSourceMinIntervalMs(sourceName: string): number {
    switch (sourceName) {
        case 'remotive':
            return 6 * 60 * 60 * 1000;   // 6h — Remotive rate limit
        case 'arbeitnow':
        case 'themuse':
            return 60 * 60 * 1000;        // 1h
        case 'africanjobs':
            return 2 * 60 * 60 * 1000;   // 2h — polite to Nigerian boards
        case 'remoteok':
        case 'jobicy':
        case 'jooble':
        case 'adzuna':
        case 'usajobs':
        case 'greenhouse':
        case 'lever':
            return 2 * 60 * 60 * 1000;   // 2h
        default:
            return 60 * 60 * 1000;
    }
}
