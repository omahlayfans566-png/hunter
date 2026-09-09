/**
 * Adzuna Provider
 * Real, documented jobs API. Free tier requires registration (app_id + app_key).
 * Endpoint: https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id=&app_key=
 * https://developer.adzuna.com/overview
 *
 * Without ADZUNA_APP_ID / ADZUNA_APP_KEY the provider reports CONFIG_REQUIRED
 * and is skipped by ingestion — the rest of the registry keeps working.
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
import { JobStatus } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'adzuna';
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs';

// Adzuna's documented regional API codes.
// Note: Nigeria ('ng') is NOT supported by Adzuna's API — use AfricanJobs/Jooble for Nigeria.
const DEFAULT_COUNTRIES = [
    'gb', 'us', 'au', 'at', 'br', 'ca', 'de', 'fr', 'in', 'it',
    'my', 'nl', 'nz', 'pl', 'sg', 'za',
];

const COUNTRY_LABELS: Record<string, string> = {
    gb: 'United Kingdom', us: 'United States', au: 'Australia', at: 'Austria',
    br: 'Brazil', ca: 'Canada', de: 'Germany', fr: 'France', in: 'India',
    it: 'Italy', my: 'Malaysia', nl: 'Netherlands', nz: 'New Zealand',
    pl: 'Poland', sg: 'Singapore', za: 'South Africa',
};

// Correct currency per country code
const COUNTRY_CURRENCY: Record<string, string> = {
    gb: 'GBP',
    au: 'AUD',
    nz: 'NZD',
    ca: 'CAD',
    de: 'EUR', fr: 'EUR', at: 'EUR', it: 'EUR', nl: 'EUR', pl: 'PLN',
    br: 'BRL',
    in: 'INR',
    sg: 'SGD',
    my: 'MYR',
    za: 'ZAR',
    us: 'USD',
};

interface AdzunaLocation {
    display_name?: string;
    [k: string]: unknown;
}

interface AdzunaCompany {
    display_name?: string;
    [k: string]: unknown;
}

interface AdzunaResult {
    id?: string;
    title?: string;
    company?: AdzunaCompany;
    location?: AdzunaLocation;
    description?: string;
    redirect_url?: string;
    created?: string;
    salary_min?: number;
    salary_max?: number;
    salary_is_predicted?: boolean;
    category?: { label?: string };
    contract_time?: string;
}

export class AdzunaSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    private get appId(): string | null {
        return process.env.ADZUNA_APP_ID?.trim() || null;
    }

    private get appKey(): string | null {
        return process.env.ADZUNA_APP_KEY?.trim() || null;
    }

    private get countries(): string[] {
        return (process.env.ADZUNA_COUNTRIES ?? DEFAULT_COUNTRIES.join(','))
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    private isConfigured(): boolean {
        return !!this.appId && !!this.appKey;
    }

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        if (!this.isConfigured()) {
            const message =
                'Adzuna requires ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables. Register at developer.adzuna.com.';
            logger.warn(`[adzuna] ${message}`);
            return { jobs: [], error: message };
        }

        const jobs: NormalizedJob[] = [];
        const seen = new Set<string>();

        try {
            for (const country of this.countries) {
                if (jobs.length >= 120) break;
                const url =
                    `${BASE_URL}/${country}/search/1?app_id=${encodeURIComponent(this.appId!)}` +
                    `&app_key=${encodeURIComponent(this.appKey!)}` +
                    `&results_per_page=40&sort_by=date&max_days_old=7&content-type=application/json`;
                try {
                    const data = (await httpFetchJson(url)) as {
                        count?: number;
                        results?: AdzunaResult[];
                    };
                    for (const raw of data.results ?? []) {
                        if (jobs.length >= 120) break;
                        const key = raw.id ? `${country}:${raw.id}` : null;
                        if (key && seen.has(key)) continue;
                        if (key) seen.add(key);

                        const normalized = this.normalize(raw, country);
                        if (normalized) jobs.push(normalized);
                    }
                } catch (err) {
                    logger.warn(`[adzuna] ${country} fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
                    // One country failing must not stop the others.
                }
            }

            logger.info(`[adzuna] Fetched ${jobs.length} developer jobs across ${this.countries.length} countries`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[adzuna] Error: ${message}`);
            return { jobs, error: message };
        }
    }

    private normalize(raw: AdzunaResult, countryCode: string): NormalizedJob | null {
        const title = raw.title?.trim();
        const company = raw.company?.display_name?.trim();
        const url = raw.redirect_url?.trim();
        if (!title || !company || !url) return null;
        if (!isValidUrl(url)) return null;
        if (!isDeveloperByTitle(title)) return null;

        const description = sanitizeHtml(raw.description ?? '');
        if (!description) return null;

        const locName = raw.location?.display_name?.trim() || COUNTRY_LABELS[countryCode] || countryCode;
        const remoteType = normalizeRemoteType(locName);
        const country = extractCountry(locName) ?? COUNTRY_LABELS[countryCode] ?? null;

        return {
            source: SOURCE_NAME,
            sourceJobId: raw.id ?? `${countryCode}:${title}`,
            title,
            companyName: company,
            companyUrl: null,
            companyLogo: null,
            description,
            location: locName,
            country,
            remoteType,
            employmentType: normalizeEmploymentType(raw.contract_time),
            tags: raw.category?.label ? [raw.category.label] : [],
            salaryMin: raw.salary_is_predicted ? null : (raw.salary_min ? Math.round(raw.salary_min) : null),
            salaryMax: raw.salary_is_predicted ? null : (raw.salary_max ? Math.round(raw.salary_max) : null),
            salaryCurrency:
                raw.salary_min !== undefined
                    ? (COUNTRY_CURRENCY[countryCode] ?? 'USD')
                    : null,
            salaryPeriod: raw.salary_min !== undefined ? 'YEARLY' : null,
            salaryRaw: null,
            applicationUrl: url,
            originalUrl: url,
            applicationMethod: determineApplicationMethod(url),
            status: JobStatus.ACTIVE,
            postedAt: raw.created ? new Date(raw.created) : null,
        };
    }

    getStatus(): SourceStatusInfo {
        if (this.isConfigured()) {
            return {
                sourceName: SOURCE_NAME,
                status: 'WORKING',
                message: `Connected — covering ${this.countries.length} countries (${this.countries
                    .map((c) => COUNTRY_LABELS[c] ?? c)
                    .join(', ')})`,
                requiresConfig: false,
            };
        }
        return {
            sourceName: SOURCE_NAME,
            status: 'CONFIG_REQUIRED',
            message:
                'Global provider (UK, US, DE, NL, AU, CA, IN, ZA and more). Add ADZUNA_APP_ID + ADZUNA_APP_KEY to server/.env (free registration at developer.adzuna.com).',
            requiresConfig: true,
            configKeys: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
        };
    }
}