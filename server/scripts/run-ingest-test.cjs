/* Runs the ingestion test detached, writing output to a log file. */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = process.cwd();
const serverDir = path.join(root, 'server');
const outFd = fs.openSync(path.join(serverDir, '_ingest-test.out.log'), 'w');
const errFd = fs.openSync(path.join(serverDir, '_ingest-test.err.log'), 'w');

const child = spawn(
    process.execPath,
    [path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(serverDir, 'scripts', 'test-ingestion.ts')],
    { cwd: serverDir, detached: true, stdio: ['ignore', outFd, errFd] },
);

child.unref();
console.log('INGEST_TEST_PID=' + child.pid);
setTimeout(() => process.exit(0), 2000);