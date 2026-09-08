/**
 * Jobicy Provider
 * Free public API v2 — no API key required. Remote/global tech & business jobs.
 * Endpoint: https://jobicy.com/api/v2/remote-jobs
 * Terms: credit Jobicy with a link, application buttons must use the original job URL.
 * https://jobi.cy/apidocs
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

const SOURCE_NAME = 'jobicy';
const API_URL = 'https://jobicy.com/api/v2/remote-jobs';

interface JobicyJob {
    id: number;
    url?: string;
    jobTitle: string;
    companyName: string;
    companyLogo?: string | null;
    jobIndustry?: string[];
    jobType?: string[];
    jobGeo?: string;
    jobLevel?: string;
    jobSalary?: string;
    jobExcerpt?: string;
    jobDescription?: string;
    pubDate?: string;
}

function normalizeJobicyJob(raw: JobicyJob): NormalizedJob | null {
    if (!raw.jobTitle || !raw.companyName) return null;
    const jobUrl = raw.url ?? `https://jobicy.com/jobs/${raw.id}`;
    if (!isValidUrl(jobUrl)) return null;

    const description = sanitizeHtml(raw.jobDescription ?? raw.jobExcerpt ?? '');
    if (!description) return null;

    const location = raw.jobGeo?.trim() || 'Remote';
    const country = extractCountry(location);
    const isRemote = /remote|anywhere|worldwide|work from anywhere/i.test(location);
    const remoteType = isRemote ? RemoteType.REMOTE : normalizeRemoteType(location);

    const tags = [
        ...(raw.jobIndustry ?? []),
        ...(raw.jobType ?? []),
        ...(raw.jobLevel ? [raw.jobLevel] : []),
    ].slice(0, 20);

    return {
        source: SOURCE_NAME,
        sourceJobId: String(raw.id),
        title: raw.jobTitle.trim(),
        companyName: raw.companyName.trim(),
        companyUrl: null,
        companyLogo: raw.companyLogo ?? null,
        description,
        location,
        country,
        remoteType,
        employmentType: normalizeEmploymentType(raw.jobType?.[0]),
        tags,
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        salaryPeriod: null,
        salaryRaw: raw.jobSalary?.trim() || null,
        applicationUrl: jobUrl,
        originalUrl: jobUrl,
        applicationMethod: determineApplicationMethod(jobUrl),
        status: JobStatus.ACTIVE,
        postedAt: raw.pubDate ? new Date(raw.pubDate) : null,
    };
}

export class JobicySource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        try {
            const data = (await httpFetchJson(API_URL)) as { jobs?: JobicyJob[] };
            const jobs: NormalizedJob[] = [];

            for (const raw of data.jobs ?? []) {
                const industry = (raw.jobIndustry ?? []).join(' ');
                if (!isDeveloperByCategory(industry) && !isDeveloperByTitle(raw.jobTitle)) continue;
                const normalized = normalizeJobicyJob(raw);
                if (normalized) jobs.push(normalized);
            }

            logger.info(`[jobicy] Fetched ${jobs.length} developer jobs (filtered from feed)`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[jobicy] Error: ${message}`);
            return { jobs: [], error: message };
        }
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message: 'Free public API — remote/global jobs (no key required)',
            requiresConfig: false,
        };
    }
}