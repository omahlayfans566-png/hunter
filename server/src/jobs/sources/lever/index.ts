/**
 * Lever Provider
 * Official, public, documented API for Lever-powered career pages:
 *   GET https://api.lever.co/v0/postings/{company}?mode=json
 * Returns array of postings with hostedUrl / applyUrl.
 *
 * Lever has no public directory of company slugs, so this provider queries
 * the list in LEVER_COMPANIES (comma separated) or a small verified default.
 * Companies no longer using Lever return 404 and are skipped safely.
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
import { isDeveloperByTitle } from '../lib/relevance';
import { httpFetchJson } from '../lib/httpFetch';
import { JobStatus, RemoteType } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'lever';
const API_BASE = 'https://api.lever.co/v0/postings';
const DEFAULT_COMPANIES = ['toptal'];

interface LeverCategories {
    commitment?: string;
    department?: string;
    location?: string;
    allLocations?: string[];
    team?: string;
}

interface LeverPosting {
    id?: string;
    text?: string;
    hostedUrl?: string;
    applyUrl?: string;
    descriptionPlain?: string;
    description?: string;
    categories?: LeverCategories;
    createdAt?: number;
    workplaceType?: string;
    country?: string | null;
    salaryRange?: { currency?: string; interval?: string; min?: number; max?: number } | null;
}

export class LeverSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    private get companies(): string[] {
        const raw = process.env.LEVER_COMPANIES?.trim();
        if (raw) {
            return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
        }
        return DEFAULT_COMPANIES;
    }

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        const jobs: NormalizedJob[] = [];
        const errors: string[] = [];

        for (const company of this.companies) {
            if (jobs.length >= 150) break;
            try {
                const url = `${API_BASE}/${encodeURIComponent(company)}?mode=json&limit=100`;
                const data = (await httpFetchJson(url, { timeoutMs: 20000 })) as LeverPosting[];
                if (!Array.isArray(data)) {
                    logger.warn(`[lever] company=${company} returned unexpected shape`);
                    continue;
                }
                let boardJobs = 0;
                for (const raw of data) {
                    if (jobs.length >= 150) break;
                    const normalized = this.normalize(raw, company);
                    if (normalized) {
                        jobs.push(normalized);
                        boardJobs++;
                    }
                }
                logger.info(`[lever] company=${company} fetched=${boardJobs} developer postings (of ${data.length})`);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'unknown';
                errors.push(`${company}: ${message}`);
                logger.warn(`[lever] company ${company} skipped: ${message}`);
            }
        }

        return errors.length > 0 && jobs.length === 0 ? { jobs, error: errors.join('; ') } : { jobs };
    }
    private normalize(raw: LeverPosting, company: string): NormalizedJob | null {
        const title = raw.text?.trim();
        const url = raw.hostedUrl?.trim();
        if (!title || !url) return null;
        if (!isValidUrl(url)) return null;
        if (!isDeveloperByTitle(title)) return null;

        const description = sanitizeHtml(raw.description ?? raw.descriptionPlain ?? '');
        if (!description) return null;

        const locName = raw.categories?.location?.trim()
            || raw.categories?.allLocations?.[0]?.trim()
            || (raw.workplaceType ? String(raw.workplaceType) : null)
            || (raw.country ? String(raw.country) : null);

        const isRemote = (raw.workplaceType?.toLowerCase().includes('remote'))
            || (raw.categories?.allLocations ?? []).some((l) => /remote|anywhere|worldwide/i.test(l))
            || String(raw.country ?? '').toLowerCase().includes('remote');

        const remoteType: RemoteType = isRemote ? RemoteType.REMOTE : normalizeRemoteType(locName);

        const tags = [
            ...(raw.categories?.team ? [raw.categories.team] : []),
            ...(raw.categories?.department ? [raw.categories.department] : []),
        ].slice(0, 10);

        const yearly = raw.salaryRange?.interval?.includes('year');
        const salaryMin = typeof raw.salaryRange?.min === 'number' && yearly ? Math.round(raw.salaryRange.min) : null;
        const salaryMax = typeof raw.salaryRange?.max === 'number' && yearly ? Math.round(raw.salaryRange.max) : null;

        const appUrl = raw.applyUrl ?? url;

        return {
            source: SOURCE_NAME,
            sourceJobId: raw.id ?? url,
            title,
            companyName: company,
            companyUrl: null,
            companyLogo: null,
            description,
            location: locName,
            country: extractCountry(locName ?? raw.country ?? undefined),
            remoteType,
            employmentType: normalizeEmploymentType(raw.categories?.commitment),
            tags,
            salaryMin,
            salaryMax,
            salaryCurrency: salaryMin !== null || salaryMax !== null ? (raw.salaryRange?.currency ?? 'USD') : null,
            salaryPeriod: salaryMin !== null || salaryMax !== null ? 'YEARLY' : null,
            salaryRaw: null,
            applicationUrl: appUrl,
            originalUrl: url,
            applicationMethod: determineApplicationMethod(appUrl, url),
            status: JobStatus.ACTIVE,
            postedAt: raw.createdAt ? new Date(raw.createdAt) : null,
        };
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message:
                'Official Lever postings API — companies: ' +
                this.companies.join(', ') +
                '. Add more with LEVER_COMPANIES.',
            requiresConfig: false,
            configKeys: ['LEVER_COMPANIES'],
        };
    }
}