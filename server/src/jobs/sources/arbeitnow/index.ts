/**
 * Arbeitnow Source
 * Free public job board API — no authentication required.
 * Endpoint: https://www.arbeitnow.com/api/job-board-api
 * Focused on software/tech jobs, primarily EU/remote.
 */

import https from 'https';
import { JobSource, JobSourceResult, NormalizedJob, SourceStatusInfo } from '../../types';
import {
    normalizeRemoteType,
    normalizeEmploymentType,
    determineApplicationMethod,
    extractCountry,
    sanitizeHtml,
    isValidUrl,
} from '../../normalizers';
import { JobStatus } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'arbeitnow';
const BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';
const MAX_PAGES = 3;

interface ArbeitnowJob {
    slug: string;
    company_name: string;
    title: string;
    description: string;
    remote: boolean;
    url: string;
    tags: string[];
    job_types: string[];
    location: string;
    created_at: number; // unix timestamp
}

interface ArbeitnowResponse {
    data: ArbeitnowJob[];
    links?: { next?: string };
    meta?: { current_page: number; last_page: number };
}

function fetchPage(url: string): Promise<ArbeitnowResponse> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'AI-Job-Hunter/1.0' } }, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body) as ArbeitnowResponse);
                } catch (e) {
                    reject(new Error('Failed to parse Arbeitnow response'));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy(new Error('Arbeitnow request timeout'));
        });
    });
}

function normalizeArbeitnowJob(raw: ArbeitnowJob): NormalizedJob | null {
    if (!raw.title || !raw.company_name || !raw.url) return null;
    if (!isValidUrl(raw.url)) return null;

    const description = sanitizeHtml(raw.description ?? '');
    if (!description) return null;

    const employmentType = raw.job_types?.length
        ? normalizeEmploymentType(raw.job_types[0])
        : null;

    const remoteType = normalizeRemoteType(raw.location, raw.remote);
    const country = extractCountry(raw.location);

    return {
        source: SOURCE_NAME,
        sourceJobId: raw.slug,
        title: raw.title.trim(),
        companyName: raw.company_name.trim(),
        companyUrl: null,
        description,
        location: raw.location || (raw.remote ? 'Remote' : null),
        country,
        remoteType,
        employmentType,
        tags: (raw.tags ?? []).slice(0, 20),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        salaryRaw: null,
        applicationUrl: raw.url,
        originalUrl: raw.url,
        applicationMethod: determineApplicationMethod(raw.url),
        status: JobStatus.ACTIVE,
        postedAt: raw.created_at ? new Date(raw.created_at * 1000) : null,
    };
}

export class ArbeitnowSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        const jobs: NormalizedJob[] = [];

        try {
            for (let page = 1; page <= MAX_PAGES; page++) {
                const url = `${BASE_URL}?page=${page}`;
                logger.info(`[arbeitnow] Fetching page ${page}...`);

                const response = await fetchPage(url);

                if (!Array.isArray(response.data) || response.data.length === 0) break;

                for (const raw of response.data) {
                    const normalized = normalizeArbeitnowJob(raw);
                    if (normalized) jobs.push(normalized);
                }

                // Stop if no next page
                if (!response.links?.next && (!response.meta || page >= response.meta.last_page)) {
                    break;
                }
            }

            logger.info(`[arbeitnow] Fetched ${jobs.length} valid jobs`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[arbeitnow] Error: ${message}`);
            return { jobs, error: message };
        }
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message: 'Free public API — no configuration required',
            requiresConfig: false,
        };
    }
}
