/* Checks connectivity to candidate databases without printing credentials. */
const net = require('net');
const fs = require('fs');
const path = require('path');

function testTcp(host, port, timeoutMs = 6000) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let done = false;
        const finish = (ok, msg) => { if (!done) { done = true; socket.destroy(); resolve({ ok, msg }); } };
        socket.setTimeout(timeoutMs);
        socket.on('connect', () => finish(true, 'open'));
        socket.on('timeout', () => finish(false, 'timeout'));
        socket.on('error', (e) => finish(false, e.message));
        socket.connect(port, host);
    });
}

async function main() {
    const supabase = await testTcp('aws-1-eu-west-1.pooler.supabase.com', 5432);
    console.log('SUPABASE_POOLER', JSON.stringify(supabase));

    // Embedded postgres data dir + module
    const scratch = path.join(process.env.TEMP || osTmp(), 'jh-pg');
    console.log('EMBEDDED_EXISTS', fs.existsSync(path.join(scratch, 'node_modules', 'embedded-postgres')));
    console.log('DATA_DIR_EXISTS', fs.existsSync(path.join(scratch, 'data')));

    const local = await testTcp('127.0.0.1', 5433);
    console.log('LOCAL_5433', JSON.stringify(local));
}

function osTmp() { try { return require('os').tmpdir(); } catch { return 'C:/Users/DELL/AppData/Local/Temp'; } }

main().catch((e) => { console.error('CHECK_FAILED', e.message); process.exitCode = 1; });