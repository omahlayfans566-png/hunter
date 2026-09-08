/**
 * Greenhouse Provider
 * Greenhouse company career pages expose an official, public, documented API:
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 * Docs: https://developers.greenhouse.io/job-board.html
 *
 * We fetch a curated list of global companies that power their careers site
 * with Greenhouse (board tokens are part of their public job URLs). The list
 * is overridable with GREENHOUSE_BOARDS (comma separated).
 *
 * Every job keeps its real absolute_url, so Apply always goes to the genuine
 * application page of the company.
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
import { JobStatus, VerificationStatus } from '../../../models/enums';
import logger from '../../../lib/logger';

const SOURCE_NAME = 'greenhouse';
const API_BASE = 'https://boards-api.greenhouse.io/v1/boards';

// Verified working boards (live-tested). Override with GREENHOUSE_BOARDS env var.
const DEFAULT_BOARDS = ['airbnb', 'canonical', 'coinbase', 'dropbox', 'lyft', 'hubspot', 'zapier'];

interface GreenhouseLocation {
    name?: string | null;
}

interface GreenhouseJob {
    id?: number;
    absolute_url?: string;
    title?: string;
    company_name?: string;
    content?: string | null;
    location?: GreenhouseLocation | null;
    updated_at?: string | null;
    first_published?: string | null;
    application_deadline?: string | null;
    departments?: Array<{ name?: string | null }>;
    offices?: Array<{ name?: string | null }>;
}

interface GreenhouseResponse {
    jobs?: GreenhouseJob[];
}
export class GreenhouseSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    private get boards(): string[] {
        const raw = process.env.GREENHOUSE_BOARDS?.trim();
        if (raw) {
            return raw.split(',').map((b) => b.trim()).filter(Boolean).slice(0, 30);
        }
        return DEFAULT_BOARDS;
    }

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        const jobs: NormalizedJob[] = [];
        const seen = new Set<string>();
        const errors: string[] = [];

        for (const board of this.boards) {
            if (jobs.length >= 150) break;
            try {
                const url = `${API_BASE}/${encodeURIComponent(board)}/jobs?content=true&per_page=100`;
                const data = (await httpFetchJson(url, { timeoutMs: 20000 })) as GreenhouseResponse;
                const list = data.jobs ?? [];

                for (const raw of list) {
                    if (jobs.length >= 150) break;
                    const key = raw.id ? String(raw.id) : raw.absolute_url;
                    if (!key || seen.has(key)) continue;
                    seen.add(key);
                    if (raw.absolute_url) seen.add(raw.absolute_url);

                    const normalized = this.normalize(raw);
                    if (normalized) jobs.push(normalized);
                }
                logger.info(`[greenhouse] board=${board} fetched=${list.length} jobs`);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'unknown';
                errors.push(`${board}: ${message}`);
                logger.warn(`[greenhouse] board ${board} failed: ${message}`);
            }
        }

        logger.info(`[greenhouse] Fetched ${jobs.length} developer jobs across ${this.boards.length} boards`);
        return errors.length > 0 && jobs.length === 0 ? { jobs, error: errors.join('; ') } : { jobs };
    }

    private normalize(raw: GreenhouseJob): NormalizedJob | null {
        const title = raw.title?.trim();
        const company = raw.company_name?.trim();
        const url = raw.absolute_url?.trim();
        if (!title || !company || !url) return null;
        if (!isValidUrl(url)) return null;
        if (!isDeveloperByTitle(title)) return null;

        const description = sanitizeHtml(raw.content ?? '');
        if (!description) return null;

        const locName = raw.location?.name?.trim() || null;
        const remoteType = normalizeRemoteType(locName);
        const country = extractCountry(locName);

        // application_deadline gives real verification evidence when present.
        let verificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED;
        if (raw.application_deadline) {
            const close = new Date(raw.application_deadline);
            if (!Number.isNaN(close.getTime()) && close.getTime() < Date.now()) {
                verificationStatus = VerificationStatus.EXPIRED;
            } else if (!Number.isNaN(close.getTime())) {
                verificationStatus = VerificationStatus.ACTIVE;
            }
        }
        if (verificationStatus === VerificationStatus.EXPIRED) return null;

        const tags = [
            ...(raw.departments ?? []).map((d) => (d.name ?? '').trim()).filter(Boolean),
            ...(raw.offices ?? []).map((o) => (o.name ?? '').trim()).filter(Boolean),
        ].slice(0, 10);

        return {
            source: SOURCE_NAME,
            sourceJobId: raw.id ? String(raw.id) : url,
            title,
            companyName: company,
            companyUrl: null,
            companyLogo: null,
            description,
            location: locName,
            country,
            remoteType,
            employmentType: null,
            tags,
            salaryMin: null,
            salaryMax: null,
            salaryCurrency: null,
            salaryPeriod: null,
            salaryRaw: null,
            applicationUrl: url,
            originalUrl: url,
            applicationMethod: determineApplicationMethod(url),
            status: JobStatus.ACTIVE,
            postedAt: raw.first_published ? new Date(raw.first_published)
                : raw.updated_at ? new Date(raw.updated_at) : null,
            verificationStatus,
        };
    }

    getStatus(): SourceStatusInfo {
        return {
            sourceName: SOURCE_NAME,
            status: 'WORKING',
            message:
                'Official Greenhouse job-board API — global company career boards (' +
                this.boards.join(', ') +
                '). Override with GREENHOUSE_BOARDS.',
            requiresConfig: false,
            configKeys: ['GREENHOUSE_BOARDS'],
        };
    }
}