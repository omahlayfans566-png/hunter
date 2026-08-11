import { JobSource } from '../types';
import { ArbeitnowSource } from './arbeitnow';
import { TheMuseSource } from './themuse';

/**
 * Central registry of all job sources.
 * Add new sources here — the ingestion engine picks them up automatically.
 */
export function getRegisteredSources(): JobSource[] {
    return [
        new ArbeitnowSource(),
        new TheMuseSource(),
    ];
}
