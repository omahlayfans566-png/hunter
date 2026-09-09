import mongoose from 'mongoose';
import { JobModel } from '../../models/Job';
import { SourceHealthModel } from '../../models/SourceHealth';
import { JobStatus, RemoteType } from '../../models/enums';
import { JobSearchParams } from '../types';
import { computeMatchScore } from './relevance.service';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VERIFIED_RECENT_MS = 48 * 60 * 60 * 1000; // "ACTIVE NOW" evidence window

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Default ordering is "Most relevant + recent + active". No single provider
 * may dominate the first page, so when no source filter is applied we fetch
 * extra candidates and interleave by source. Duplicates are already merged
 * into one canonical row (with a sources[] list) by the ingestion pipeline.
 */
export const jobService = {
    async searchJobs(params: JobSearchParams) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));

        // Build the MongoDB filter
        const filter: Record<string, unknown> = {
            status: params.status ?? JobStatus.ACTIVE,
        };

        if (params.keyword) {
            const kw = params.keyword.trim();
            // Use $text for indexed full-text search when a text index exists,
            // with a regex fallback across key fields
            filter.$or = [
                { title: { $regex: kw, $options: 'i' } },
                { companyName: { $regex: kw, $options: 'i' } },
                { description: { $regex: kw, $options: 'i' } },
                { tags: { $regex: kw, $options: 'i' } },
            ];
        }

        if (params.remote === true) {
            filter.remoteType = RemoteType.REMOTE;
        }

        if (params.country) {
            filter.country = { $regex: params.country, $options: 'i' };
        }

        if (params.location) {
            filter.location = { $regex: params.location, $options: 'i' };
        }

        if (params.employmentType) {
            filter.employmentType = { $regex: params.employmentType, $options: 'i' };
        }

        if (params.source) {
            filter.source = params.source;
        }

        // NEW TODAY — posted today per the source
        if (params.newToday) {
            filter.postedAt = { $gte: startOfToday() };
        }

        // POSTED WITHIN N days
        if (params.postedWithin && params.postedWithin > 0 && !params.newToday) {
            const cutoff = new Date(Date.now() - params.postedWithin * 24 * 60 * 60 * 1000);
            filter.postedAt = { $gte: cutoff };
        }

        // ACTIVE NOW — listing still has evidence of being available within 48h
        if (params.activeNow) {
            const cutoff = new Date(Date.now() - VERIFIED_RECENT_MS);
            const activeNowOr = [
                { verificationStatus: 'ACTIVE' },
                { lastVerifiedAt: { $gte: cutoff } },
                { lastSeenAt: { $gte: cutoff } },
            ];

            if (filter.$and) {
                (filter.$and as unknown[]).push({ $or: activeNowOr });
            } else {
                filter.$and = [{ $or: activeNowOr }];
            }
        }

        // Determine sort order
        let sortBy: Record<string, 1 | -1>;
        switch (params.sortBy) {
            case 'oldest':
                sortBy = { postedAt: 1 };
                break;
            case 'company':
                sortBy = { companyName: 1 };
                break;
            case 'newest':
                sortBy = { postedAt: -1 };
                break;
            case 'relevance':
            default:
                sortBy = { matchScore: -1, postedAt: -1 };
                break;
        }

        // Fields to return (no description on list view — saves bandwidth).
        // Note: 'id' is a virtual derived from _id — do not include in projection.
        const projection = '-description -__v';

        const total = await JobModel.countDocuments(filter);

        // Source diversity: on page 1 with no source filter, fetch 4x and interleave
        const diversify = !params.source && page === 1 && params.sortBy !== 'company';
        const fetchCount = diversify ? Math.min(MAX_LIMIT, limit * 4) : limit;
        const skip = (page - 1) * (diversify ? fetchCount : limit);

        const fetched = await JobModel.find(filter, projection)
            .sort(sortBy)
            .skip(skip)
            .limit(fetchCount)
            .lean();

        // Normalise _id → id
        let jobs = fetched.map((j) => ({
            ...j,
            id: j._id.toString(),
            _id: undefined,
        })) as Array<Record<string, unknown> & { source: string }>;

        // Round-robin interleave so no single provider fills the page.
        if (diversify && jobs.length > limit) {
            const bySource = new Map<string, typeof jobs>();
            for (const job of jobs) {
                if (!bySource.has(job.source)) bySource.set(job.source, []);
                bySource.get(job.source)!.push(job);
            }
            const keys = [...bySource.keys()];
            const pointers = new Map(keys.map((k) => [k, 0]));
            const assembled: typeof jobs = [];
            let cycle = 0;
            let exhausted = 0;
            while (assembled.length < limit && exhausted < keys.length) {
                const key = keys[cycle % keys.length];
                const list = bySource.get(key)!;
                const idx = pointers.get(key)!;
                if (idx < list.length) {
                    assembled.push(list[idx]);
                    pointers.set(key, idx + 1);
                    exhausted = 0;
                } else {
                    exhausted++;
                }
                cycle++;
            }
            jobs = assembled;
        }

        return {
            jobs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    },

    async getJobById(id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        const job = await JobModel.findById(id).lean();
        if (!job) return null;
        return { ...job, id: job._id.toString(), _id: undefined };
    },

    async getSourceHealth() {
        const docs = await SourceHealthModel.find().sort({ sourceName: 1 }).lean();
        return docs.map((d) => ({ ...d, id: d._id.toString(), _id: undefined }));
    },

    async getStats() {
        const [total, active, remote, today] = await Promise.all([
            JobModel.countDocuments(),
            JobModel.countDocuments({ status: JobStatus.ACTIVE }),
            JobModel.countDocuments({ remoteType: RemoteType.REMOTE, status: JobStatus.ACTIVE }),
            JobModel.countDocuments({ postedAt: { $gte: startOfToday() }, status: JobStatus.ACTIVE }),
        ]);
        return { total, active, remote, today };
    },

    /** Distinct countries in active jobs — used for the LOCATION filter. */
    async getDistinctCountries(): Promise<string[]> {
        const countries = await JobModel.distinct('country', {
            status: JobStatus.ACTIVE,
            country: { $ne: null, $exists: true },
        });
        return (countries as (string | null)[]).filter((c): c is string => Boolean(c)).sort();
    },

    /**
     * Top matches for a specific user — recalculates match scores live so
     * the results always reflect the user's current profile, then returns the
     * top N active jobs sorted by personal match score.
     */
    async getTopMatches(userId: string, limit = 10): Promise<unknown[]> {
        // Fetch a generous candidate set sorted by stored matchScore
        const candidates = await JobModel.find(
            { status: JobStatus.ACTIVE },
            '-__v',
        )
            .sort({ matchScore: -1, postedAt: -1 })
            .limit(limit * 5) // over-fetch so we can re-score and reorder
            .lean();

        // Re-score each candidate against the requesting user's live profile
        const scored = await Promise.all(
            candidates.map(async (job) => {
                const liveScore = await computeMatchScore(
                    {
                        title: job.title,
                        tags: job.tags,
                        description: job.description,
                        country: job.country,
                        location: job.location,
                        remoteType: job.remoteType,
                        employmentType: job.employmentType,
                    },
                    userId,
                );
                return {
                    ...job,
                    id: job._id.toString(),
                    _id: undefined,
                    matchScore: liveScore,
                };
            }),
        );

        // Sort by live score desc, then freshness
        scored.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            const aDate = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const bDate = b.postedAt ? new Date(b.postedAt).getTime() : 0;
            return bDate - aDate;
        });

        return scored.slice(0, limit);
    },

    /** Save a job for a user. Idempotent — saving twice is not an error. */
    async saveJob(userId: string, jobId: string): Promise<{ saved: boolean; savedJobId: string }> {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            throw new Error('Invalid job ID');
        }
        const job = await JobModel.findById(jobId).lean();
        if (!job) throw new Error('Job not found');

        const { SavedJobModel } = await import('../../models/SavedJob');
        try {
            const doc = await SavedJobModel.create({
                userId: new mongoose.Types.ObjectId(userId),
                jobId: new mongoose.Types.ObjectId(jobId),
            });
            return { saved: true, savedJobId: doc._id.toString() };
        } catch (err: unknown) {
            // Duplicate key — already saved
            if ((err as { code?: number }).code === 11000) {
                const existing = await SavedJobModel.findOne({
                    userId: new mongoose.Types.ObjectId(userId),
                    jobId: new mongoose.Types.ObjectId(jobId),
                }).lean();
                return { saved: true, savedJobId: existing?._id.toString() ?? '' };
            }
            throw err;
        }
    },

    /** Remove a saved job. */
    async unsaveJob(userId: string, jobId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(jobId)) return;
        const { SavedJobModel } = await import('../../models/SavedJob');
        await SavedJobModel.deleteOne({
            userId: new mongoose.Types.ObjectId(userId),
            jobId: new mongoose.Types.ObjectId(jobId),
        });
    },

    /** Get all saved jobs for a user, newest first, populated with job details. */
    async getSavedJobs(userId: string): Promise<unknown[]> {
        const { SavedJobModel } = await import('../../models/SavedJob');
        const docs = await SavedJobModel.find({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('jobId', '-description -__v')
            .lean();

        return docs.map((d) => {
            // After populate(), jobId is the full job document object.
            // If populate failed / doc was deleted, it stays as an ObjectId.
            const rawJob = d.jobId;
            const isPopulated = rawJob && typeof rawJob === 'object' && !('toHexString' in rawJob);
            const job = isPopulated ? (rawJob as unknown as Record<string, unknown>) : null;
            return {
                savedJobId: d._id.toString(),
                savedAt: (d as unknown as { createdAt: Date }).createdAt,
                job: job ? { ...job, id: (job._id as { toString(): string }).toString(), _id: undefined } : null,
            };
        }).filter((d) => d.job !== null);
    },

    /** Count saved jobs for a user. */
    async savedJobsCount(userId: string): Promise<number> {
        const { SavedJobModel } = await import('../../models/SavedJob');
        return SavedJobModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
    },
};