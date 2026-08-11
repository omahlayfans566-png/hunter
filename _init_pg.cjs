const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

const scratch = path.join(os.tmpdir(), 'jh-pg');
const pkgIndex = path.join(scratch, 'node_modules', 'embedded-postgres', 'dist', 'index.js');

(async () => {
    const mod = await import(pathToFileURL(pkgIndex).href);
    const EmbeddedPostgres = mod.default || mod;

    const dataDir = path.join(scratch, 'data');

    const pg = new EmbeddedPostgres({
        databaseDir: dataDir,
        port: 5433,
        user: 'postgres',
        password: 'postgres',
        authMethod: 'password',
        persistent: true,
        onLog: (m) => console.log('[pg] ' + m),
        onError: (m) => console.error('[pg-err] ' + m),
    });

    try {
        // Re-init only if the data dir is fresh; harmless (skipped) if already initialized.
        try {
            await pg.initialise();
        } catch (e) {
            console.log('initialise skipped/note: ' + (e && e.message));
        }
        await pg.start();
        console.log('started');
    } catch (e) {
        console.error('PG_BOOT_ERR: ' + (e && (e.stack || e.message)));
        process.exit(1);
    }
    try {
        await pg.createDatabase('job_hunter_dev');
        console.log('created database job_hunter_dev');
    } catch (e) {
        console.log('createDatabase note (likely exists): ' + (e && e.message));
    }
    console.log('PG_READY_ON_5433');
    // Keep this process alive so the Postgres cluster stays up.
    setInterval(() => {}, 1000);
})().catch((e) => {
    console.error('PG_FATAL: ' + (e && (e.stack || e.message)));
    process.exit(1);
});