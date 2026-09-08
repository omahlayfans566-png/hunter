/* TLS check for Supabase pooler. */
const tls = require('tls');
const net = require('net');

function tryTls(host, port) {
    return new Promise((resolve) => {
        let done = false;
        const finish = (ok, msg) => { if (!done) { done = true; socket.destroy(); resolve({ ok, msg }); } };
        const socket = new tls.TLSSocket(new net.Socket({ allowHalfOpen: false }), { servername: host, rejectUnauthorized: false, isServer: false });
        socket.on('connect', () => finish(true, 'tls-connected'));
        socket.on('secureConnect', () => finish(true, 'secure'));
        socket.on('error', (e) => finish(false, e.message));
        socket.setTimeout(8000, () => finish(false, 'timeout'));
        socket.connect(port, host);
    });
}

async function main() {
    const a = await tryTls('aws-1-eu-west-1.pooler.supabase.com', 5432);
    console.log('TLS_SUPABASE', JSON.stringify(a));
}
main().catch((e) => { console.error('FAILED', e.message); process.exitCode = 1; });