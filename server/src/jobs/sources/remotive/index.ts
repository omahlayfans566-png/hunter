/**
 * Remotive Provider
 * Free public API — no API key required. Remote jobs worldwide.
 * Endpoint: https://remotive.com/api/remote-jobs
 * Terms: max ~4 requests/day, jobs delayed by 24h, must link back & credit Remotive.
 * https://remotive.com/api-documentation
 */

import { JobSource, JobSourceResult, NormalizedJob, SourceStatusInfo } from '../../types';
import {
    normalizeRemoteType,
    normalizeEmploymentType,
    determineApplicationMethod,
    extractCountry,
    sanitizeHtml,
    isValidUrl,
} from '../../normalizers';
import { isDeveloperByCategory, isDeveloperByTitle } from '../lib/relevance';
import { httpFetchJson } from '../lib/httpFetch';
import { JobStatus, RemoteType } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'remotive';
const API_URL = 'https://remotive.com/api/remote-jobs?limit=100';

interface RemotiveJob {
    id: number;
    url: string;
    title: string;
    company_name: string;
    company_logo?: string | null;
    category: string;
    tags: string[];
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    salary?: string;
    description?: string;
}

function normalizeRemotiveJob(raw: RemotiveJob): NormalizedJob | null {
    if (!raw.title || !raw.company_name || !raw.url) return null;
    if (!isValidUrl(raw.url)) return null;

    const description = sanitizeHtml(raw.description ?? '');
    if (!description) return null;

    const location = raw.candidate_required_location?.trim() || 'Remote';
    const remoteType = RemoteType.REMOTE;
    const country = extractCountry(location);

    return {
        source: SOURCE_NAME,
        sourceJobId: String(raw.id),
        title: raw.title.trim(),
        companyName: raw.company_name.trim(),
        companyUrl: null,
        companyLogo: raw.company_logo ?? null,
        description,
        location,
        country,
        remoteType,
        employmentType: normalizeEmploymentType(raw.job_type),
        tags: (raw.tags ?? []).slice(0, 20),
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        salaryRaw: raw.salary?.trim() || null,
        applicationUrl: raw.url,
        originalUrl: raw.url,
        applicationMethod: determineApplicationMethod(raw.url),
        status: JobStatus.ACTIVE,
        postedAt: raw.publication_date ? new Date(raw.publication_date) : null,
    };
}

export class RemotiveSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        try {
            const data = (await httpFetchJson(API_URL)) as { jobs?: RemotiveJob[] };
            const jobs: NormalizedJob[] = [];

            for (const raw of data.jobs ?? []) {
                if (!isDeveloperByCategory(raw.category) && !isDeveloperByTitle(raw.title)) continue;
                const normalized = normalizeRemotiveJob(raw);
                if (normalized) jobs.push(normalized);
            }

            logger.info(`[remotive] Fetched ${jobs.length} developer jobs (filtered from feed)`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[remotive] Error: ${message}`);
            return { jobs: [], error: message };
        }
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message: 'Free public API — remote jobs worldwide (no key required)',
            requiresConfig: false,
        };
    }
}