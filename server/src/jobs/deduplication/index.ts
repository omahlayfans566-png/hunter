import { JobModel } from '../../models/Job';
import { RemoteType } from '../../models/enums';
import { NormalizedJob } from '../types';
import { normalizeCanonicalUrl, normalizeTitle } from '../normalizers';

export interface DuplicateResult {
    duplicate: boolean;
    existingId: string | null;
}

function normalizeLocationKey(job: { location?: string | null; remoteType?: string }): string {
    if (job.remoteType === RemoteType.REMOTE) return 'remote';
    const loc = (job.location ?? '').trim().toLowerCase();
    return loc || (job.remoteType ? job.remoteType.toLowerCase() : 'unknown');
}

/**
 * Multi-provider duplicate detection.
 * A job is a duplicate when ANY of these match an existing row:
 *  1. same (source, sourceJobId)            — the authoritative per-provider key
 *  2. same canonical URL                    — captures aggregator re-posts / tracking params
 *  3. same original URL                     — back-compat for pre-canonical rows
 *  4. same company + normalized title + location/remote vector
 *                                             — catches same listing across providers
 */
export async function findDuplicate(job: NormalizedJob): Promise<DuplicateResult> {
    // 1. Per-provider key
    if (job.sourceJobId) {
        const existing = await JobModel.findOne(
            { source: job.source, sourceJobId: job.sourceJobId },
            { _id: 1 },
        ).lean();
        if (existing) return { duplicate: true, existingId: existing._id.toString() };
    }

    // 2. Canonical URL normalization
    const canonical = normalizeCanonicalUrl(job.originalUrl);
    const byCanonical = await JobModel.findOne({ canonicalUrl: canonical }, { _id: 1 }).lean();
    if (byCanonical) return { duplicate: true, existingId: byCanonical._id.toString() };

    // 3. Exact original URL (historical rows may lack canonicalUrl)
    const byUrl = await JobModel.findOne({ originalUrl: job.originalUrl }, { _id: 1 }).lean();
    if (byUrl) return { duplicate: true, existingId: byUrl._id.toString() };

    // 4. Fuzzy match across providers (company + title + location)
    const normTitle = normalizeTitle(job.title);
    const locationKey = normalizeLocationKey(job);

    const candidates = await JobModel.find(
        {
            companyName: { $regex: new RegExp(`^${escapeRegex(job.companyName)}$`, 'i') },
            status: { $ne: 'REMOVED' },
        },
        { _id: 1, title: 1, location: 1, remoteType: 1 },
    )
        .limit(50)
        .lean();

    for (const candidate of candidates) {
        if (normalizeTitle(candidate.title) === normTitle) {
            if (normalizeLocationKey(candidate) === locationKey) {
                return { duplicate: true, existingId: candidate._id.toString() };
            }
        }
    }

    return { duplicate: false, existingId: null };
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
