const { Client } = require('pg');

(async () => {
    const client = new Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'postgres', database: 'postgres' });
    await client.connect();
    const res = await client.query("SELECT pg_encoding_to_char(encoding) AS enc, datname FROM pg_database WHERE datname='job_hunter_dev'");
    console.log('DB_ENCODING', JSON.stringify(res.rows));
    await client.end();
})().catch((e) => { console.error('FAILED', e.message); process.exitCode = 1; });