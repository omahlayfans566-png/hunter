import prisma from '../../lib/prisma';
import logger from '../../lib/logger';
import { getRegisteredSources } from '../sources/registry';
import { isDuplicate } from '../deduplication';
import { IngestionResult } from '../types';
import { isValidUrl } from '../normalizers';

const LAST_RUN_COOLDOWN_MS = 60 * 1000; // 60 seconds between manual runs
let lastRunAt: Date | null = null;

export async function runIngestion(sourceName?: string): Promise<IngestionResult[]> {
    // Cooldown guard against spam
    if (lastRunAt && Date.now() - lastRunAt.getTime() < LAST_RUN_COOLDOWN_MS) {
        const wait = Math.ceil((LAST_RUN_COOLDOWN_MS - (Date.now() - lastRunAt.getTime())) / 1000);
        throw new Error(`Please wait ${wait}s before running again.`);
    }
    lastRunAt = new Date();

    const sources = getRegisteredSources().filter(
        (s) => !sourceName || s.sourceName === sourceName,
    );

    const results: IngestionResult[] = [];

    for (const source of sources) {
        const result: IngestionResult = {
            source: source.sourceName,
            fetched: 0,
            saved: 0,
            duplicates: 0,
            errors: 0,
            success: false,
        };

        // Update source health: running
        await upsertSourceHealth(source.sourceName, { status: 'RUNNING', lastRunAt: new Date() });

        try {
            const { jobs, error } = await source.fetchJobs();
            result.fetched = jobs.length;

            if (error && jobs.length === 0) {
                result.errorMessage = error;
                result.errors = 1;
                await upsertSourceHealth(source.sourceName, {
                    status: 'ERROR',
                    lastErrorAt: new Date(),
                    lastErrorMsg: error,
                });
                results.push(result);
                continue;
            }

            for (const job of jobs) {
                try {
                    // Validate required fields
                    if (!job.title || !job.companyName || !job.originalUrl) {
                        result.errors++;
                        continue;
                    }
                    if (!isValidUrl(job.originalUrl)) {
                        result.errors++;
                        continue;
                    }

                    // Deduplication check
                    const duplicate = await isDuplicate(job);
                    if (duplicate) {
                        result.duplicates++;
                        // Update lastCheckedAt on existing job
                        if (job.sourceJobId) {
                            await prisma.job.updateMany({
                                where: { source: job.source, sourceJobId: job.sourceJobId },
                                data: { lastCheckedAt: new Date() },
                            });
                        }
                        continue;
                    }

                    // Save new job
                    await prisma.job.create({
                        data: {
                            source: job.source,
                            sourceJobId: job.sourceJobId,
                            title: job.title,
                            companyName: job.companyName,
                            companyUrl: job.companyUrl,
                            description: job.description,
                            location: job.location,
                            country: job.country,
                            remoteType: job.remoteType,
                            employmentType: job.employmentType,
                            tags: job.tags,
                            salaryMin: job.salaryMin,
                            salaryMax: job.salaryMax,
                            salaryCurrency: job.salaryCurrency,
                            salaryPeriod: job.salaryPeriod,
                            salaryRaw: job.salaryRaw,
                            applicationUrl: job.applicationUrl,
                            originalUrl: job.originalUrl,
                            applicationMethod: job.applicationMethod,
                            status: job.status,
                            postedAt: job.postedAt,
                        },
                    });
                    result.saved++;
                } catch (jobErr) {
                    result.errors++;
                    logger.warn(`[ingestion] Failed to save job from ${source.sourceName}: ${jobErr instanceof Error ? jobErr.message : 'unknown'}`);
                }
            }

            result.success = true;
            await upsertSourceHealth(source.sourceName, {
                status: 'SUCCESS',
                lastSuccessAt: new Date(),
                jobsFetched: result.fetched,
                jobsNew: result.saved,
                jobsDuplicate: result.duplicates,
            });

            logger.info(
                `[ingestion] ${source.sourceName}: fetched=${result.fetched} new=${result.saved} dupes=${result.duplicates} errors=${result.errors}`,
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            result.errorMessage = msg;
            result.errors++;
            logger.error(`[ingestion] Source ${source.sourceName} failed: ${msg}`);
            await upsertSourceHealth(source.sourceName, {
                status: 'ERROR',
                lastErrorAt: new Date(),
                lastErrorMsg: msg,
            });
        }

        results.push(result);
    }

    return results;
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
    },
) {
    try {
        await prisma.sourceHealth.upsert({
            where: { sourceName },
            update: { ...data, updatedAt: new Date() },
            create: { sourceName, ...data },
        });
    } catch {
        // Non-critical — don't crash ingestion if health update fails
    }
}
