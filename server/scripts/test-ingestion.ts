// Real ingestion smoke test. Defaults to local dev Postgres.
process.env.LOCAL = process.env.LOCAL ?? '1';
if (process.env.LOCAL === '1') {
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/job_hunter_dev';
    process.env.DIRECT_URL = process.env.DIRECT_URL ?? 'postgresql://postgres:postgres@localhost:5433/job_hunter_dev';
}

async function main() {
    const { runIngestion } = await import('../src/jobs/services/ingestion.service');
    const { default: prisma } = await import('../src/lib/prisma');

    console.log('JOBS_BEFORE', await prisma.job.count());
    const results = await runIngestion(undefined, { force: true });
    for (const r of results) {
        console.log(
            `RESULT ${r.source} ok=${r.success} fetched=${r.fetched} new=${r.saved} ` +
            `dupes=${r.duplicates} expired=${r.expired} errors=${r.errors} skipped=${r.skipped} msg=${r.errorMessage ?? ''}`,
        );
    }
    console.log('JOBS_AFTER', await prisma.job.count());

    const bySource = await prisma.job.groupBy({ by: ['source'], _count: { _all: true } });
    console.log('BY_SOURCE', JSON.stringify(bySource));

    const byCountry = await prisma.job.groupBy({ by: ['country'], _count: { _all: true }, orderBy: { _count: { country: 'desc' } }, take: 15 });
    console.log('BY_COUNTRY', JSON.stringify(byCountry));

    const health = await prisma.sourceHealth.findMany({ orderBy: { sourceName: 'asc' } });
    console.log('HEALTH', JSON.stringify(health));

    await prisma.$disconnect();
}

main().catch((e) => { console.error('INGESTION_TEST_FAILED', e); process.exitCode = 1; });