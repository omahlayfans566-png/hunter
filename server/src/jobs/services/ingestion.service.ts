import { JobModel } from '../../models/Job';
import { SourceHealthModel } from '../../models/SourceHealth';
import { DeveloperProfileModel } from '../../models/DeveloperProfile';
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

// Maximum time (ms) a single provider fetch may take before we abort it.
const PER_SOURCE_TIMEOUT_MS = 30_000; // 30 seconds

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
    return {
        source,
        fetched: 0,
        saved: 0,
        duplicates: 0,
        errors: 0,
        expired: 0,
        skipped: false,
        success: false,
    };
}

/** Per-provider rate limiting: skip providers refreshed too recently. */
async function shouldFetch(sourceName: string): Promise<boolean> {
    const intervalMs = getSourceMinIntervalMs(sourceName);
    const health = await SourceHealthModel.findOne({ sourceName }).lean();
    const anchor = health?.lastSuccessAt ?? health?.lastRunAt;
    if (!anchor) return true;
    return Date.now() - new Date(anchor).getTime() >= intervalMs;
}

/**
 * Wrap a provider's fetchJobs() with a hard timeout so one slow provider
 * can never block the entire ingestion run.
 */
async function fetchWithTimeout(
    source: { sourceName: string; fetchJobs: () => Promise<{ jobs: NormalizedJob[]; error?: string }> },
    timeoutMs: number,
): Promise<{ jobs: NormalizedJob[]; error?: string }> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            resolve({ jobs: [], error: `Provider timeout after ${timeoutMs / 1000}s` });
        }, timeoutMs);

        source
            .fetchJobs()
            .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
            .catch((err) => {
                clearTimeout(timer);
                resolve({
                    jobs: [],
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            });
    });
}

/** Insert a brand-new canonical job row. */
async function insertJob(job: NormalizedJob, userId?: string): Promise<void> {
    const canonicalUrl = normalizeCanonicalUrl(job.originalUrl);
    const verificationStatus = job.verificationStatus ?? VerificationStatus.UNVERIFIED;
    const matchScore = await computeMatchScore(job, userId);

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
        lastVerifiedAt:
            verificationStatus !== VerificationStatus.UNVERIFIED ? nowStamp() : null,
    });
}

/**
 * Same listing found again — do NOT create a second row: renew it instead.
 */
async function renewJob(existingId: string, job: NormalizedJob, userId?: string): Promise<void> {
    const existing = await JobModel.findById(existingId, {
        status: 1,
        sources: 1,
        postedAt: 1,
        canonicalUrl: 1,
        verificationStatus: 1,
    }).lean();
    if (!existing) return;

    const sources = Array.from(new Set([...(existing.sources ?? []), job.source]));
    const matchScore = await computeMatchScore(job, userId);

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

    if (existing.status !== JobStatus.ACTIVE && job.status === JobStatus.ACTIVE) {
        updateData.status = JobStatus.ACTIVE;
        if (!updateData.verificationStatus) {
            updateData.verificationStatus =
                job.verificationStatus ?? VerificationStatus.UNVERIFIED;
        }
        updateData.lastVerifiedAt = nowStamp();
    }

    if (
        job.postedAt &&
        (!existing.postedAt || job.postedAt > existing.postedAt)
    ) {
        updateData.postedAt = job.postedAt;
    }

    if (!existing.canonicalUrl) {
        updateData.canonicalUrl = normalizeCanonicalUrl(job.originalUrl);
    }

    await JobModel.findByIdAndUpdate(existingId, { $set: updateData });
}

/** Expire active listings from one source that haven't been re-confirmed in time. */
async function expireStaleJobs(source: string): Promise<number> {
    const cutoff = new Date(
        Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
    );
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

/** Process all jobs returned by a single source. */
async function processSourceJobs(
    sourceName: string,
    jobs: NormalizedJob[],
    result: IngestionResult,
    userId?: string,
): Promise<void> {
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
                await renewJob(duplicate.existingId, job, userId);
                continue;
            }

            await insertJob(job, userId);
            result.saved++;
        } catch (jobErr) {
            result.errors++;
            logger.warn(
                `[ingestion] Failed to save job from ${sourceName}: ${jobErr instanceof Error ? jobErr.message : 'unknown'
                }`,
            );
        }
    }
}

/**
 * Run ingestion for all registered sources (or a single named source).
 *
 * All eligible sources are fetched CONCURRENTLY with a per-source 30s hard
 * timeout. A single slow/broken source can never block the others.
 */
export async function runIngestion(
    sourceName?: string,
    options?: IngestionRunOptions,
): Promise<IngestionResult[]> {
    const opts = options ?? {};
    const force = opts.force === true;

    if (
        !force &&
        !opts.scheduled &&
        lastManualRunAt &&
        Date.now() - lastManualRunAt < MANUAL_COOLDOWN_MS
    ) {
        const waitMs = MANUAL_COOLDOWN_MS - (Date.now() - lastManualRunAt);
        const wait = Math.ceil(waitMs / 1000);
        throw new Error(`Please wait ${wait}s before running again.`);
    }
    if (!force && !opts.scheduled) lastManualRunAt = Date.now();

    // Get the first available developer profile for relevance scoring at
    // ingestion time. This is a single-user tool pattern.
    const profileForScoring = await DeveloperProfileModel.findOne(
        {},
        { userId: 1 },
    ).lean();
    const ingestUserId = profileForScoring?.userId?.toString();

    const allSources = getRegisteredSources().filter(
        (s) => !sourceName || s.sourceName === sourceName,
    );

    // Determine which sources should actually fetch
    const fetchDecisions = await Promise.all(
        allSources.map(async (s) => ({
            source: s,
            should: force ? true : await shouldFetch(s.sourceName),
        })),
    );

    // Mark skipped sources immediately
    const results: IngestionResult[] = fetchDecisions
        .filter((d) => !d.should)
        .map((d) => {
            const r = newResult(d.source.sourceName);
            r.success = true;
            r.skipped = true;
            r.errorMessage = 'Skipped — fetched too recently for provider rate limits.';
            return r;
        });

    const toFetch = fetchDecisions.filter((d) => d.should);

    // Mark all about-to-run sources as RUNNING concurrently
    await Promise.allSettled(
        toFetch.map((d) =>
            upsertSourceHealth(d.source.sourceName, {
                status: 'RUNNING',
                lastRunAt: nowStamp(),
            }),
        ),
    );

    // ── Concurrent fetch across all eligible sources ───────────────────────
    const fetchResults = await Promise.allSettled(
        toFetch.map(async (d) => {
            const result = newResult(d.source.sourceName);
            try {
                const { jobs, error } = await fetchWithTimeout(
                    d.source,
                    PER_SOURCE_TIMEOUT_MS,
                );
                result.fetched = jobs.length;

                if (error && jobs.length === 0) {
                    result.errorMessage = error;
                    result.errors = 1;
                    await upsertSourceHealth(d.source.sourceName, {
                        status: 'ERROR',
                        lastErrorAt: nowStamp(),
                        lastErrorMsg: error,
                    });
                    return result;
                }

                // Process jobs for this source sequentially (DB writes need order)
                await processSourceJobs(
                    d.source.sourceName,
                    jobs,
                    result,
                    ingestUserId,
                );

                // Stale sweep only after a successful fetch
                if (jobs.length > 0) {
                    result.expired = await expireStaleJobs(d.source.sourceName);
                }

                result.success = true;
                const activeCount = await sourceActiveJobCount(d.source.sourceName);
                await upsertSourceHealth(d.source.sourceName, {
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
                logger.error(
                    `[ingestion] Source ${d.source.sourceName} failed: ${msg}`,
                );
                await upsertSourceHealth(d.source.sourceName, {
                    status: 'ERROR',
                    lastErrorAt: nowStamp(),
                    lastErrorMsg: msg,
                });
            }
            return result;
        }),
    );

    // Collect results from allSettled (they can't reject due to inner try/catch)
    for (const settled of fetchResults) {
        if (settled.status === 'fulfilled') {
            results.push(settled.value);
        } else {
            // Shouldn't happen, but be defensive
            const r = newResult('unknown');
            r.errorMessage = settled.reason?.message ?? 'Unknown error';
            results.push(r);
        }
    }

    return results;
}
