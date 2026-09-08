/* Boots the embedded Postgres used for local dev (port 5433). Non-interactive. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const child = spawn(process.execPath, [path.join(root, '_init_pg.cjs')], {
    cwd: root,
    detached: true,
    stdio: 'ignore',
});

// Keep the child alive after this script exits.
child.unref();

fs.writeFileSync(path.join(root, '_pg.pid'), String(child.pid));
console.log('PG_BOOT_PID=' + child.pid);
setTimeout(() => process.exit(0), 3000);