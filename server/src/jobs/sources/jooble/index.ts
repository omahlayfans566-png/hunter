/**
 * Jooble Source
 * Jooble is a global job aggregator with a documented, free API.
 * API docs: https://jooble.org/api/about
 *
 * Coverage: worldwide — specifically strong for Nigeria, UK, USA, Europe,
 * Canada, Australia, and remote jobs. This makes it the primary source for
 * Nigerian and African developer jobs on this platform.
 *
 * Requires: JOOBLE_API_KEY (free registration at https://jooble.org/api/about)
 * Without the key the source reports CONFIG_REQUIRED and is skipped.
 *
 * Request format: POST https://jooble.org/api/{key}
 * Body: { keywords, location, page, resultsOnPage }
 *
 * We query multiple keyword+location combinations concurrently to maximise
 * coverage across Nigeria, UK, USA, Canada, and worldwide remote.
 */

import https from 'https';
import { JobSource, JobSourceResult, NormalizedJob, SourceStatusInfo } from '../../types';
import {
    sanitizeHtml,
    truncate,
    normalizeRemoteType,
    normalizeEmploymentType,
    extractCountry,
    isValidUrl,
} from '../../normalizers';
import { isDeveloperByTitle } from '../lib/relevance';
import { JobStatus, ApplicationMethod } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'jooble';
const API_BASE = 'https://jooble.org/api';
const TIMEOUT_MS = 20_000;
const MAX_JOBS = 200;

// Location + keyword pairs we will search.
// Jooble is strong for Nigeria and African cities.
const SEARCH_TARGETS = [
    { location: 'Nigeria', keywords: 'software developer' },
    { location: 'Nigeria', keywords: 'frontend developer react' },
    { location: 'Nigeria', keywords: 'backend developer node' },
    { location: 'Lagos', keywords: 'developer engineer' },
    { location: 'Abuja', keywords: 'developer engineer' },
    { location: 'United Kingdom', keywords: 'software developer' },
    { location: 'London', keywords: 'frontend developer' },
    { location: 'United States', keywords: 'software engineer' },
    { location: 'Remote', keywords: 'software developer' },
    { location: 'Remote', keywords: 'react developer typescript' },
];

interface JoobleJob {
    id?: string | number;
    title?: string;
    company?: string;
    location?: string;
    snippet?: string;
    salary?: string;
    source?: string;
    link?: string;
    updated?: string;
    type?: string;
}

interface JoobleResponse {
    totalCount?: number;
    jobs?: JoobleJob[];
}

function jooblePost(
    key: string,
    body: { keywords: string; location: string; page: number; resultsOnPage: number },
    timeoutMs: number,
): Promise<JoobleResponse> {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const options = {
            hostname: 'jooble.org',
            path: `/api/${encodeURIComponent(key)}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': 'AI-Job-Hunter/1.0',
            },
        };

        const req = https.request(options, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data) as JoobleResponse);
                } catch {
                    reject(new Error('Invalid JSON from Jooble'));
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(timeoutMs, () => req.destroy(new Error('Jooble request timeout')));
        req.write(payload);
        req.end();
    });
}

let _lastStatus: SourceStatusInfo = {
    sourceName: SOURCE_NAME,
    status: 'UNKNOWN',
    message: 'Not yet fetched',
    requiresConfig: true,
    configKeys: ['JOOBLE_API_KEY'],
};

export class JoobleSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    private get apiKey(): string | null {
        return process.env.JOOBLE_API_KEY?.trim() || null;
    }

    getStatus(): SourceStatusInfo {
        return _lastStatus;
    }

    async fetchJobs(): Promise<JobSourceResult> {
        if (!this.apiKey) {
            const msg =
                'Jooble requires JOOBLE_API_KEY. Register free at https://jooble.org/api/about';
            logger.warn(`[jooble] ${msg}`);
            _lastStatus = {
                sourceName: SOURCE_NAME,
                status: 'CONFIG_REQUIRED',
                message: msg,
                requiresConfig: true,
                configKeys: ['JOOBLE_API_KEY'],
            };
            return { jobs: [], error: msg };
        }

        const key = this.apiKey;
        const jobs: NormalizedJob[] = [];
        const seenUrls = new Set<string>();

        // Fetch all search targets concurrently
        const results = await Promise.allSettled(
            SEARCH_TARGETS.map((target) =>
                jooblePost(
                    key,
                    {
                        keywords: target.keywords,
                        location: target.location,
                        page: 1,
                        resultsOnPage: 20,
                    },
                    TIMEOUT_MS,
                ),
            ),
        );

        for (let i = 0; i < results.length; i++) {
            const settled = results[i];
            const target = SEARCH_TARGETS[i];

            if (settled.status === 'rejected') {
                logger.warn(
                    `[jooble] ${target.location}/${target.keywords} failed: ${settled.reason?.message ?? 'unknown'}`,
                );
                continue;
            }

            const list = settled.value.jobs ?? [];
            for (const raw of list) {
                if (jobs.length >= MAX_JOBS) break;

                const title = raw.title?.trim();
                const company = raw.company?.trim() || 'Company';
                const link = raw.link?.trim();

                if (!title || !link || !isValidUrl(link)) continue;
                if (seenUrls.has(link)) continue;
                seenUrls.add(link);

                if (!isDeveloperByTitle(title)) continue;

                const description = raw.snippet
                    ? truncate(sanitizeHtml(raw.snippet), 3000)
                    : `${title} at ${company}. View full details on Jooble.`;

                const location = raw.location?.trim() || target.location;
                const remoteType = normalizeRemoteType(location);

                // Determine country — use target.location as fallback context
                let country = extractCountry(location);
                if (!country && target.location !== 'Remote') {
                    country = extractCountry(target.location);
                }

                let postedAt: Date | null = null;
                if (raw.updated) {
                    const d = new Date(raw.updated);
                    if (!isNaN(d.getTime())) postedAt = d;
                }

                // Parse salary if provided
                let salaryRaw: string | null = null;
                let salaryCurrency: string | null = null;
                if (raw.salary && raw.salary.trim()) {
                    salaryRaw = raw.salary.trim();
                    if (salaryRaw.includes('₦') || salaryRaw.toLowerCase().includes('ngn'))
                        salaryCurrency = 'NGN';
                    else if (salaryRaw.includes('£')) salaryCurrency = 'GBP';
                    else if (salaryRaw.includes('€')) salaryCurrency = 'EUR';
                    else if (salaryRaw.includes('$')) salaryCurrency = 'USD';
                }

                jobs.push({
                    source: SOURCE_NAME,
                    sourceJobId: raw.id ? String(raw.id) : link,
                    title,
                    companyName: company,
                    companyUrl: null,
                    companyLogo: null,
                    description,
                    location,
                    country,
                    remoteType,
                    employmentType: normalizeEmploymentType(raw.type ?? null),
                    tags: [],
                    salaryMin: null,
                    salaryMax: null,
                    salaryCurrency,
                    salaryPeriod: null,
                    salaryRaw,
                    applicationUrl: link,
                    originalUrl: link,
                    applicationMethod: ApplicationMethod.EXTERNAL,
                    status: JobStatus.ACTIVE,
                    postedAt,
                });
            }
        }

        _lastStatus = {
            sourceName: SOURCE_NAME,
            status: jobs.length > 0 ? 'WORKING' : 'UNAVAILABLE',
            message: `Fetched ${jobs.length} developer jobs from Nigeria, UK, USA, Remote`,
            requiresConfig: false,
        };

        logger.info(`[jooble] fetched ${jobs.length} developer jobs`);
        return { jobs };
    }
}
