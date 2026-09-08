/* Runs _init_pg.cjs in foreground, kills it after `maxMs`, then reports whether PG is up. */
const { spawn } = require('child_process');
const path = require('path');

const root = process.cwd();
const maxMs = 25000;
const child = spawn(process.execPath, [path.join(root, '_init_pg.cjs')], { cwd: root });

let out = '';
child.stdout.on('data', (d) => { out += d.toString(); console.error('[pg-out] ' + d.toString().trim()); });
child.stderr.on('data', (d) => { console.error('[pg-err] ' + d.toString().trim()); });

const timer = setTimeout(() => {
    console.error('TIMEOUT reached — killing PG process');
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 3000);
}, maxMs);

child.on('exit', (code, sig) => {
    clearTimeout(timer);
    console.error('PG_EXITED code=' + code + ' signal=' + sig);
    console.error('READY_PRESENT=' + out.includes('PG_READY_ON_5433'));
    process.exit(0);
});