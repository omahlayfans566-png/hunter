import { Prisma, JobStatus, RemoteType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { JobSearchParams } from '../types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const jobService = {
    async searchJobs(params: JobSearchParams) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
        const skip = (page - 1) * limit;

        const where: Prisma.JobWhereInput = {
            status: params.status ?? JobStatus.ACTIVE,
        };

        if (params.keyword) {
            const kw = params.keyword.trim();
            where.OR = [
                { title: { contains: kw, mode: 'insensitive' } },
                { companyName: { contains: kw, mode: 'insensitive' } },
                { tags: { has: kw } },
                { description: { contains: kw, mode: 'insensitive' } },
            ];
        }

        if (params.remote === true) {
            where.remoteType = RemoteType.REMOTE;
        }

        if (params.country) {
            where.country = { contains: params.country, mode: 'insensitive' };
        }

        if (params.employmentType) {
            where.employmentType = { contains: params.employmentType, mode: 'insensitive' };
        }

        if (params.source) {
            where.source = params.source;
        }

        let orderBy: Prisma.JobOrderByWithRelationInput;
        switch (params.sortBy) {
            case 'oldest':
                orderBy = { postedAt: 'asc' };
                break;
            case 'company':
                orderBy = { companyName: 'asc' };
                break;
            case 'newest':
            default:
                orderBy = { postedAt: 'desc' };
                break;
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                select: {
                    id: true,
                    source: true,
                    title: true,
                    companyName: true,
                    location: true,
                    country: true,
                    remoteType: true,
                    employmentType: true,
                    tags: true,
                    salaryMin: true,
                    salaryMax: true,
                    salaryCurrency: true,
                    salaryPeriod: true,
                    salaryRaw: true,
                    applicationUrl: true,
                    originalUrl: true,
                    applicationMethod: true,
                    status: true,
                    postedAt: true,
                    discoveredAt: true,
                },
            }),
            prisma.job.count({ where }),
        ]);

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
        return prisma.job.findUnique({ where: { id } });
    },

    async getSourceHealth() {
        return prisma.sourceHealth.findMany({ orderBy: { sourceName: 'asc' } });
    },

    async getStats() {
        const [total, active, remote, today] = await Promise.all([
            prisma.job.count(),
            prisma.job.count({ where: { status: JobStatus.ACTIVE } }),
            prisma.job.count({ where: { remoteType: RemoteType.REMOTE, status: JobStatus.ACTIVE } }),
            prisma.job.count({
                where: {
                    discoveredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ]);
        return { total, active, remote, today };
    },
};
