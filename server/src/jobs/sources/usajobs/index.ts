/**
 * USAJOBS Provider
 * Official U.S. Government job-search API. Requires free registration:
 *   - USAJOBS_EMAIL (the registered email)
 *   - USAJOBS_KEY   (account API key)
 * Endpoint: https://data.usajobs.gov/api/search
 * Headers per docs: Host, User-Agent (email), Authorization (Basic email:key).
 * https://developer.usajobs.gov/
 *
 * U.S. jobs incl. remote positions. ApplicationCloseDate gives real evidence
 * about whether the listing is still accepting applications.
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

const SOURCE_NAME = 'usajobs';
const API_URL = 'https://data.usajobs.gov/api/search';
const KEYWORDS = ['developer', 'software', 'engineer', 'devops', 'data', 'cloud', 'security', 'frontend', 'backend', 'react', 'node'];

interface UsaJobsLocation {
    LocationName?: string;
    [k: string]: unknown;
}

interface UsaJobsDescriptor {
    PositionID?: string;
    PositionTitle?: string;
    PositionURI?: string;
    OrganizationName?: string;
    PositionLocation?: UsaJobsLocation[];
    PositionOfferingType?: Array<{ Name?: string }>;
    PositionSchedule?: Array<{ Name?: string }>;
    MinimumRange?: number | null;
    MaximumRange?: number | null;
    RateIntervalCode?: 'Per Year' | 'Per Hour' | string;
    PublicationStartDate?: string;
    ApplicationCloseDate?: string | null;
    UserArea?: { Details?: { JobSummary?: string; MajorDuties?: string } };
}

export class UsaJobsSource implements JobSource {
    readonly sourceName = SOURCE_NAME;

    private get email(): string | null {
        return process.env.USAJOBS_EMAIL?.trim() || null;
    }

    private get apiKey(): string | null {
        return process.env.USAJOBS_KEY?.trim() || null;
    }

    private isConfigured(): boolean {
        return !!this.email && !!this.apiKey;
    }

    async fetchJobs(_keywords?: string[]): Promise<JobSourceResult> {
        if (!this.isConfigured()) {
            const message =
                'USAJOBS requires USAJOBS_EMAIL and USAJOBS_KEY environment variables (free registration at developer.usajobs.gov).';
            logger.warn(`[usajobs] ${message}`);
            return { jobs: [], error: message };
        }

        const jobs: NormalizedJob[] = [];
        const seen = new Set<string>();
        const auth = Buffer.from(`${this.email}:${this.apiKey}`).toString('base64');

        try {
            for (const keyword of KEYWORDS) {
                if (jobs.length >= 120) break;
                const url = `${API_URL}?Keyword=${encodeURIComponent(keyword)}&ResultsPerPage=15&RemoteIndicator=true`;
                const data = (await httpFetchJson(url, {
                    headers: {
                        Host: 'data.usajobs.gov',
                        'User-Agent': this.email!,
                        Authorization: `Basic ${auth}`,
                    },
                })) as {
                    SearchResult?: { SearchResultItems?: Array<{ MatchedObjectDescriptor?: UsaJobsDescriptor }> };
                };

                for (const item of data.SearchResult?.SearchResultItems ?? []) {
                    if (jobs.length >= 120) break;
                    const descriptor = item.MatchedObjectDescriptor;
                    if (!descriptor) continue;
                    const key = descriptor.PositionID ?? descriptor.PositionURI ?? '';
                    if (!key || seen.has(key)) continue;
                    seen.add(key);

                    const normalized = this.normalize(descriptor);
                    if (normalized) jobs.push(normalized);
                }
            }

            logger.info(`[usajobs] Fetched ${jobs.length} active developer jobs`);
            return { jobs };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error(`[usajobs] Error: ${message}`);
            return { jobs, error: message };
        }
    }

    private normalize(d: UsaJobsDescriptor): NormalizedJob | null {
        const title = d.PositionTitle?.trim();
        const company = d.OrganizationName?.trim();
        const url = d.PositionURI?.trim();
        if (!title || !company || !url) return null;
        if (!isValidUrl(url)) return null;
        if (!isDeveloperByTitle(title)) return null;

        // Close-date evidence: skip listings that are no longer accepting applications.
        let verificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED;
        if (d.ApplicationCloseDate) {
            const close = new Date(d.ApplicationCloseDate);
            if (Number.isNaN(close.getTime())) {
                verificationStatus = VerificationStatus.UNVERIFIED;
            } else if (close.getTime() < Date.now()) {
                verificationStatus = VerificationStatus.EXPIRED;
            } else {
                verificationStatus = VerificationStatus.ACTIVE;
            }
        }
        if (verificationStatus === VerificationStatus.EXPIRED) return null;

        const locName = d.PositionLocation?.[0]?.LocationName?.trim() || 'United States';
        const remoteType = normalizeRemoteType(locName);
        const country = extractCountry(locName) ?? 'United States';

        const summary = sanitizeHtml(d.UserArea?.Details?.JobSummary ?? '');
        const duties = sanitizeHtml(d.UserArea?.Details?.MajorDuties ?? '');
        const description = [summary, duties].filter(Boolean).join('\n\n');

        const isYearly = (d.RateIntervalCode ?? '').toLowerCase().includes('year');
        const salaryMin = typeof d.MinimumRange === 'number' && isYearly ? Math.round(d.MinimumRange) : null;
        const salaryMax = typeof d.MaximumRange === 'number' && isYearly ? Math.round(d.MaximumRange) : null;

        return {
            source: SOURCE_NAME,
            sourceJobId: d.PositionID ?? d.PositionURI ?? url,
            title,
            companyName: company,
            companyUrl: null,
            companyLogo: null,
            description: description || 'No description provided by source.',
            location: locName,
            country,
            remoteType,
            employmentType: normalizeEmploymentType(d.PositionSchedule?.[0]?.Name),
            tags: (d.PositionOfferingType ?? [])
                .map((t) => t.Name ?? '')
                .filter(Boolean)
                .slice(0, 5),
            salaryMin,
            salaryMax,
            salaryCurrency: 'USD',
            salaryPeriod: isYearly ? 'YEARLY' : null,
            salaryRaw:
                typeof d.MinimumRange === 'number' || typeof d.MaximumRange === 'number'
                    ? `${d.MinimumRange ?? ''} - ${d.MaximumRange ?? ''} ${isYearly ? 'USD/year' : ''}`.trim()
                    : null,
            applicationUrl: url,
            originalUrl: url,
            applicationMethod: determineApplicationMethod(url),
            status: JobStatus.ACTIVE,
            postedAt: d.PublicationStartDate ? new Date(d.PublicationStartDate) : null,
            verificationStatus,
        };
    }

    getStatus(): SourceStatusInfo {
        if (this.isConfigured()) {
            return {
                sourceName: SOURCE_NAME,
                status: 'WORKING',
                message: 'Connected — official USAJobs API (US government + remote)',
                requiresConfig: false,
            };
        }
        return {
            sourceName: SOURCE_NAME,
            status: 'CONFIG_REQUIRED',
            message:
                'US Government jobs. Add USAJOBS_EMAIL + USAJOBS_KEY to server/.env (free registration at developer.usajobs.gov).',
            requiresConfig: true,
            configKeys: ['USAJOBS_EMAIL', 'USAJOBS_KEY'],
        };
    }
}