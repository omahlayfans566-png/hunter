/* Temporary inspection script — reports current jobs distribution. */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const [total, bySource, byStatus, byCountry, sourceHealth, recent] = await Promise.all([
        prisma.job.count(),
        prisma.job.groupBy({ by: ['source'], _count: { _all: true }, orderBy: { _count: { source: 'desc' } } }),
        prisma.job.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.job.groupBy({ by: ['country'], _count: { _all: true }, orderBy: { _count: { country: 'desc' } }, take: 20 }),
        prisma.sourceHealth.findMany({ orderBy: { sourceName: 'asc' } }),
        prisma.job.count({ where: { postedAt: { gte: new Date(Date.now() - 3 * 24 * 3600 * 1000) } } }),
    ]);
    console.log('TOTAL_JOBS', total);
    console.log('BY_SOURCE', JSON.stringify(bySource));
    console.log('BY_STATUS', JSON.stringify(byStatus));
    console.log('BY_COUNTRY', JSON.stringify(byCountry));
    console.log('RECENT_3D', recent);
    console.log('SOURCE_HEALTH', JSON.stringify(sourceHealth.map((h) => ({ source: h.sourceName, status: h.status, fetched: h.jobsFetched, new: h.jobsNew, dupes: h.jobsDuplicate, lastRun: h.lastRunAt, lastErr: h.lastErrorMsg ? h.lastErrorMsg.slice(0, 120) : null })), null, 2));
}

main()
    .catch((e) => { console.error('INSPECT_FAILED', e.message); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());