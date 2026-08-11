import prisma from '../../lib/prisma';
import { NormalizedJob } from '../types';

/**
 * Determines if a normalized job already exists in the database.
 * Primary key: source + sourceJobId (when available).
 * Fallback: exact originalUrl match.
 */
export async function isDuplicate(job: NormalizedJob): Promise<boolean> {
    // Primary: source + sourceJobId unique constraint
    if (job.sourceJobId) {
        const existing = await prisma.job.findUnique({
            where: { source_sourceJobId: { source: job.source, sourceJobId: job.sourceJobId } },
            select: { id: true },
        });
        if (existing) return true;
    }

    // Fallback: same originalUrl
    const urlMatch = await prisma.job.findFirst({
        where: { originalUrl: job.originalUrl },
        select: { id: true },
    });
    return !!urlMatch;
}
