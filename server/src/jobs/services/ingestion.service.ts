import { JobModel } from '../../models/Job';
import { SourceHealthModel } from '../../models/SourceHealth';
import { JobStatus, VerificationStatus } from '../../models/enums';
import logger from '../../lib/logger';
import { getRegisteredSources, getSourceMinIntervalMs } from '../sources/registry';
import { findDuplicate } from '../deduplication';
import { IngestionResult, NormalizedJob } from '../types';
import { isValidUrl, normalizeCanonicalUrl } from '../normalizers';
import { computeMatchScore } from './relevance.service';

const MANUAL_COOLDOWN_MS = 60 * 1000; // 60 seconds between manual runs
let lastManualRunAt: number | null = null;

// A listing not re-confirmed for this long is treated as expired.
export const STALE_AFTER_DAYS = Number(process.env.JOB_STALE_AFTER_DAYS ?? 14);

const nowStamp = () => new Date();

/** OR conditions selecting listings not re-confirmed before the cutoff. */
function staleOrClause(cutoff: Date) {
    return [
        { lastSeenAt: { $lt: cutoff } },
        { lastSeenAt: null, lastCheckedAt: { $lt: cutoff } },
    ];
}

export interface IngestionRunOptions {
    /** Admin/"run now" — bypasses manual cooldown and per-source intervals. */
    force?: boolean;
    /** Scheduler run — bypasses manual cooldown but still respects per-source intervals. */
    scheduled?: boolean;
}

async function upsertSourceHealth(
    sourceName: string,
    data: {
        status?: string;
        lastRunAt?: Date;
        lastSuccessAt?: Date;
        lastErrorAt?: Date;
        lastErrorMsg?: string;
        jobsFetched?: number;
        jobsNew?: number;
        jobsDuplicate?: number;
        jobsExpired?: number;
        jobsActive?: number;
    },
) {
    try {
        await SourceHealthModel.findOneAndUpdate(
            { sourceName },
            { $set: { ...data, updatedAt: nowStamp() } },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );
    } catch {
        // Non-critical — never crash ingestion because health persistence failed.
    }
}

function newResult(source: string): IngestionResult {
    return { source, fetched: 0, saved: 0, duplicates: 0, errors: 0, expired: 0, skipped: false, success: false };
}

/** Per-provider rate limiting: skip fetching providers refreshed too recently. */
async function shouldFetch(sourceName: string): Promise<boolean> {
    const intervalMs = getSourceMinIntervalMs(sourceName);
    const health = await SourceHealthModel.findOne({ sourceName }).lean();
    const anchor = health?.lastSuccessAt ?? health?.lastRunAt;
    if (!anchor) return true;
    return Date.now() - new Date(anchor).getTime() >= intervalMs;
}

/** Insert a brand-new canonical job row. */
async function insertJob(job: NormalizedJob): Promise<void> {
    const canonicalUrl = normalizeCanonicalUrl(job.originalUrl);
    const verificationStatus = job.verificationStatus ?? VerificationStatus.UNVERIFIED;
    const matchScore = await computeMatchScore(job);

    await JobModel.create({
        source: job.source,
        sourceJobId: job.sourceJobId ?? null,
        title: job.title,
        companyName: job.companyName,
        companyUrl: job.companyUrl ?? null,
        companyLogo: job.companyLogo ?? null,
        description: job.description,
        location: job.location ?? null,
        country: job.country ?? null,
        remoteType: job.remoteType ?? 'UNKNOWN',
        employmentType: job.employmentType ?? null,
        tags: job.tags ?? [],
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        salaryCurrency: job.salaryCurrency ?? null,
        salaryPeriod: job.salaryPeriod ?? null,
        salaryRaw: job.salaryRaw ?? null,
        applicationUrl: job.applicationUrl ?? null,
        originalUrl: job.originalUrl,
        applicationMethod: job.applicationMethod ?? 'EXTERNAL',
        status: JobStatus.ACTIVE,
        postedAt: job.postedAt ?? null,
        canonicalUrl,
        matchScore,
        sources: [job.source],
        lastSeenAt: nowStamp(),
        lastCheckedAt: nowStamp(),
        verificationStatus,
        lastVerifiedAt: verificationStatus !== VerificationStatus.UNVERIFIED ? nowStamp() : null,
    });
}

/**
 * Same listing found again — do NOT create a second row: renew it instead.
 */
async function renewJob(existingId: string, job: NormalizedJob): Promise<void> {
    const existing = await JobModel.findById(existingId, {
        status: 1, sources: 1, postedAt: 1, canonicalUrl: 1, verificationStatus: 1,
    }).lean();
    if (!existing) return;

    const sources = Array.from(new Set([...(existing.sources ?? []), job.source]));
    const matchScore = await computeMatchScore(job);

    const updateData: Record<string, unknown> = {
        lastSeenAt: nowStamp(),
        lastCheckedAt: nowStamp(),
        sources,
        matchScore,
    };

    if (job.verificationStatus && job.verificationStatus !== VerificationStatus.UNVERIFIED) {
        updateData.verificationStatus = job.verificationStatus;
        updateData.lastVerifiedAt = nowStamp();
    }

    // Provider explicitly reports the listing is open → revive it if it lapsed.
    if (existing.status !== JobStatus.ACTIVE && job.status === JobStatus.ACTIVE) {
        updateData.status = JobStatus.ACTIVE;
        if (!updateData.verificationStatus) {
            updateData.verificationStatus = job.verificationStatus ?? VerificationStatus.UNVERIFIED;
        }
        updateData.lastVerifiedAt = nowStamp();
    }

    // Use the freshest posting date we have evidence for.
    if (job.postedAt && (!existing.postedAt || job.postedAt > existing.postedAt)) {
        updateData.postedAt = job.postedAt;
    }

    if (!existing.canonicalUrl) {
        updateData.canonicalUrl = normalizeCanonicalUrl(job.originalUrl);
    }

    await JobModel.findByIdAndUpdate(existingId, { $set: updateData });
}

/** Expire active listings from one source that haven't been re-confirmed in time. */
async function expireStaleJobs(source: string): Promise<number> {
    const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const result = await JobModel.updateMany(
        {
            source,
            status: JobStatus.ACTIVE,
            $or: staleOrClause(cutoff),
        },
        {
            $set: {
                status: JobStatus.EXPIRED,
                verificationStatus: VerificationStatus.EXPIRED,
                lastVerifiedAt: nowStamp(),
            },
        },
    );
    return result.modifiedCount;
}

async function sourceActiveJobCount(source: string): Promise<number> {
    return JobModel.countDocuments({ source, status: JobStatus.ACTIVE });
}

export async function runIngestion(sourceName?: string, options?: IngestionRunOptions): Promise<IngestionResult[]> {
    const opts = options ?? {};
    const force = opts.force === true;

    if (!force && !opts.scheduled && lastManualRunAt && Date.now() - lastManualRunAt < MANUAL_COOLDOWN_MS) {
        const waitMs = MANUAL_COOLDOWN_MS - (Date.now() - lastManualRunAt);
        const wait = Math.ceil(waitMs / 1000);
        throw new Error(`Please wait ${wait}s before running again.`);
    }
    if (!force && !opts.scheduled) lastManualRunAt = Date.now();

    const sources = getRegisteredSources().filter((s) => !sourceName || s.sourceName === sourceName);
    const results: IngestionResult[] = [];

    for (const source of sources) {
        const result = newResult(source.sourceName);

        if (!force && !(await shouldFetch(source.sourceName))) {
            result.success = true;
            result.skipped = true;
            result.errorMessage = 'Skipped — fetched too recently for provider rate limits.';
            results.push(result);
            continue;
        }

        await upsertSourceHealth(source.sourceName, { status: 'RUNNING', lastRunAt: nowStamp() });

        try {
            const { jobs, error } = await source.fetchJobs();
            result.fetched = jobs.length;

            if (error && jobs.length === 0) {
                result.errorMessage = error;
                result.errors = 1;
                await upsertSourceHealth(source.sourceName, {
                    status: 'ERROR',
                    lastErrorAt: nowStamp(),
                    lastErrorMsg: error,
                });
                results.push(result);
                continue;
            }

            for (const job of jobs) {
                try {
                    if (!job.title?.trim() || !job.companyName?.trim() || !job.originalUrl) {
                        result.errors++;
                        continue;
                    }
                    if (!isValidUrl(job.originalUrl)) {
                        result.errors++;
                        continue;
                    }

                    const duplicate = await findDuplicate(job);
                    if (duplicate.duplicate && duplicate.existingId) {
                        result.duplicates++;
                        await renewJob(duplicate.existingId, job);
                        continue;
                    }

                    await insertJob(job);
                    result.saved++;
                } catch (jobErr) {
                    result.errors++;
                    logger.warn(
                        `[ingestion] Failed to save job from ${source.sourceName}: ${jobErr instanceof Error ? jobErr.message : 'unknown'}`,
                    );
                }
            }

            // Stale sweep only after a successful fetch (never after a provider outage).
            if (jobs.length > 0) {
                result.expired = await expireStaleJobs(source.sourceName);
            }

            result.success = true;
            const activeCount = await sourceActiveJobCount(source.sourceName);
            await upsertSourceHealth(source.sourceName, {
                status: 'SUCCESS',
                lastSuccessAt: nowStamp(),
                jobsFetched: result.fetched,
                jobsNew: result.saved,
                jobsDuplicate: result.duplicates,
                jobsExpired: result.expired,
                jobsActive: activeCount,
            });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            result.errorMessage = msg;
            result.errors = result.errors || 1;
            logger.error(`[ingestion] Source ${source.sourceName} failed: ${msg}`);
            await upsertSourceHealth(source.sourceName, {
                status: 'ERROR',
                lastErrorAt: nowStamp(),
                lastErrorMsg: msg,
            });
        }

        results.push(result);
    }

    return results;
}
