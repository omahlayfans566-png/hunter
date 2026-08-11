/**
 * The Muse Source
 * Free public REST API v2 — optional API key for higher rate limits.
 * Endpoint: https://www.themuse.com/api/public/jobs
 * Focused on software engineering, data science, design, and more.
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
import { JobStatus } from '@prisma/client';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'themuse';
const BASE_URL = 'https://www.themuse.com/api/public/jobs';
// Engineering-relevant categories from The Muse API
const CATEGORIES = ['Engineering', 'Data and Analytics', 'IT', 'Product'];
const MAX_PAGES = 2; // per category

interface TheMuseLocation {
    name: string;
}

interface TheMuseCompany {
    id: number;
    short_name: string;
    name: string;
}

interface TheMuseJob {
    id: number;
    name: string;
    contents: string;
    refs: { landing_page: string };
    locations: TheMuseLocation[];
    levels: Array<{ name: string; short_name: string }>;
    company: TheMuseCompany;
    publication_date: string;
    categories: Array<{ name: string }>;
    job_type?: string;
}

interface TheMuseResponse {
    results: TheMuseJob[];
    page: number;
    page_count: number;
}

function fetchPage(url: string): Promise<TheMuseResponse> {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { 'User-Agent': 'AI-Job-Hunter/1.0' } }, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body) as TheMuseResponse);
                } catch {
                    reject(new Error('Failed to parse The Muse response'));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(15000, () => {
            req.destroy(new Error('The Muse request timeout'));
        });
    });
}

function normalizeMuseJob(raw: TheMuseJob): NormalizedJob | null {
    if (!raw.name || !raw.company?.name) return null;

    const landingPage = raw.refs?.landing_page;
    if (!landingPage || !isValidUrl(landingPage)) return null;

    const description = sanitizeHtml(raw.contents ?? '');
    if (!description) return null;

    const locationName = raw.locations?.[0]?.name ?? null;
    const remoteType = normalizeRemoteType(locationName);
    const country = extractCountry(locationName);
    const employmentType = normalizeEmploymentType(raw.job_type ?? null);

    const tags = [
        ...(raw.categories?.map((c) => c.name) ?? []),
        ...(raw.levels?.map((l) => l.name) ?? []),
    ].slice(0, 15);

    return {
        source: SOURCE_NAME,
        sourceJobId: String(raw.id),
        title: raw.name.trim(),
        companyName: raw.company.name.trim(),
        companyUrl: null,
        description,
        location: locationName,
        country,
        remoteType,
        employmentType,
        tags,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        salaryRaw: null,
        applicationUrl: landingPage,
        originalUrl: landingPage,
        applicationMethod: determineApplicationMethod(landingPage),
        status: JobStatus.ACTIVE,
        postedAt: raw.publication_date ? new Date(raw.publication_date) : null,
    };
}

export class TheMuseSource implements JobSource {
    readonly sourceName = SOURCE_NAME;
    private readonly apiKey: string | null;

    constructor() {
        this.apiKey = process.env.THEMUSE_API_KEY ?? null;
    }

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        const jobs: NormalizedJob[] = [];
        const seenIds = new Set<string>();

        try {
            for (const category of CATEGORIES) {
                for (let page = 0; page < MAX_PAGES; page++) {
                    const params = new URLSearchParams({
                        category,
                        page: String(page),
                        descending: 'true',
                    });
                    if (this.apiKey) params.set('api_key', this.apiKey);

                    const url = `${BASE_URL}?${params.toString()}`;
                    logger.info(`[themuse] Fetching category=${category} page=${page}...`);

                    const response = await fetchPage(url);

                    if (!Array.isArray(response.results) || response.results.length === 0) break;

                    for (const raw of response.results) {
                        const key = String(raw.id);
                        if (seenIds.has(key)) continue;
                        seenIds.add(key);

                        const normalized = normalizeMuseJob(raw);
                        if (normalized) jobs.push(normalized);
                    }

                    if (page >= response.page_count - 1) break;
                }
            }

            logger.info(`[themuse] Fetched ${jobs.length} valid jobs`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[themuse] Error: ${message}`);
            return { jobs, error: message };
        }
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message: this.apiKey
                ? 'API key configured — higher rate limits active'
                : 'Running without API key — limited rate. Set THEMUSE_API_KEY for higher limits.',
            requiresConfig: false,
            configKeys: ['THEMUSE_API_KEY'],
        };
    }
}
