/**
 * RemoteOK Source
 * API: https://remoteok.com/api
 * Free, no auth required. Returns JSON array.
 * Rate limit: be polite — 2h refresh interval enforced by registry.
 * Terms: https://remoteok.com/api — public API, aggregation permitted.
 */

import { httpFetchJson } from '../lib/httpFetch';
import { JobSource, JobSourceResult, NormalizedJob, SourceStatusInfo } from '../../types';
import { JobStatus, RemoteType, ApplicationMethod } from '../../../models/enums';
import {
    sanitizeHtml,
    truncate,
    normalizeCanonicalUrl,
    extractCountry,
    normalizeEmploymentType,
} from '../../normalizers';
import { isDeveloperByTitle, isDeveloperByCategory } from '../lib/relevance';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'remoteok';
const API_URL = 'https://remoteok.com/api';
const MAX_JOBS = 150;

interface RemoteOKJob {
    id?: string | number;
    slug?: string;
    position?: string;
    company?: string;
    company_logo?: string;
    url?: string;
    apply_url?: string;
    description?: string;
    tags?: string[];
    location?: string;
    date?: string; // ISO string
    salary_min?: number;
    salary_max?: number;
    equity?: boolean;
    company_url?: string;
}

let _lastStatus: SourceStatusInfo = {
    sourceName: SOURCE_NAME,
    status: 'UNKNOWN',
    message: 'Not yet fetched',
    requiresConfig: false,
};

export class RemoteOKSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    async fetchJobs(): Promise<JobSourceResult> {
        const jobs: NormalizedJob[] = [];

        try {
            // RemoteOK returns an array where the first element is a metadata object
            const rawResponse = await httpFetchJson(API_URL, {
                headers: {
                    // RemoteOK requires a real User-Agent — bots without it get blocked
                    'User-Agent': 'AI-Job-Hunter/1.0 (personal job search tool)',
                    'Accept': 'application/json',
                },
                timeoutMs: 15000,
            });

            const raw = rawResponse as RemoteOKJob[];

            if (!Array.isArray(raw)) {
                _lastStatus = { sourceName: SOURCE_NAME, status: 'UNAVAILABLE', message: 'Unexpected response format', requiresConfig: false };
                return { jobs: [], error: 'Unexpected response format from RemoteOK' };
            }

            // First element is a legal/metadata notice object — skip it
            const listings = raw.slice(1).filter((j) => j && j.id && j.position);

            for (const raw of listings) {
                if (jobs.length >= MAX_JOBS) break;

                const title = (raw.position ?? '').trim();
                const company = (raw.company ?? '').trim();

                if (!title || !company) continue;
                if (!isDeveloperByTitle(title) && !isDeveloperByCategory((raw.tags ?? []).join(' '))) continue;

                const originalUrl = raw.url ?? `https://remoteok.com/remote-jobs/${raw.slug ?? raw.id}`;
                if (!originalUrl) continue;

                const description = raw.description
                    ? truncate(sanitizeHtml(raw.description), 5000)
                    : `${title} at ${company}. Apply via RemoteOK.`;

                const tags = (raw.tags ?? [] as string[])
                    .map((t: string) => t.trim().toLowerCase())
                    .filter((t: string) => t.length > 0 && t.length < 40);

                const location = raw.location && raw.location.toLowerCase() !== 'worldwide'
                    ? raw.location
                    : 'Remote / Worldwide';

                const country = extractCountry(location);

                let postedAt: Date | null = null;
                if (raw.date) {
                    const d = new Date(raw.date);
                    if (!isNaN(d.getTime())) postedAt = d;
                }

                const applicationUrl = raw.apply_url ?? raw.url ?? null;

                jobs.push({
                    source: SOURCE_NAME,
                    sourceJobId: String(raw.id ?? raw.slug ?? ''),
                    title,
                    companyName: company,
                    companyUrl: raw.company_url ?? null,
                    companyLogo: raw.company_logo ?? null,
                    description,
                    location,
                    country,
                    remoteType: RemoteType.REMOTE, // RemoteOK is exclusively remote
                    employmentType: normalizeEmploymentType(
                        (raw.tags ?? [] as string[]).find((t: string) => /full.?time|part.?time|contract|freelance/i.test(t))
                    ),
                    tags,
                    salaryMin: raw.salary_min ?? null,
                    salaryMax: raw.salary_max ?? null,
                    salaryCurrency: raw.salary_min ? 'USD' : null,
                    salaryPeriod: raw.salary_min ? 'YEARLY' : null,
                    salaryRaw: raw.salary_min && raw.salary_max
                        ? `$${raw.salary_min.toLocaleString()} – $${raw.salary_max.toLocaleString()}/yr`
                        : null,
                    applicationUrl,
                    originalUrl,
                    applicationMethod: applicationUrl ? ApplicationMethod.EXTERNAL : ApplicationMethod.MANUAL,
                    status: JobStatus.ACTIVE,
                    postedAt,
                });
            }

            _lastStatus = {
                sourceName: SOURCE_NAME,
                status: 'WORKING',
                message: `Fetched ${jobs.length} developer jobs`,
                requiresConfig: false,
            };

            logger.info(`[remoteok] fetched ${listings.length} total, ${jobs.length} developer jobs`);
            return { jobs };

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            logger.warn(`[remoteok] fetch failed: ${msg}`);
            _lastStatus = { sourceName: SOURCE_NAME, status: 'UNAVAILABLE', message: msg, requiresConfig: false };
            return { jobs: [], error: msg };
        }
    }

    getStatus(): SourceStatusInfo {
        return _lastStatus;
    }
}
