/* Reinstall embedded-postgres into the project's scratch dir (%TEMP%\jh-pg). */
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const scratch = path.join(os.tmpdir(), 'jh-pg');
fs.mkdirSync(scratch, { recursive: true });

const npmCli = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const logPath = path.join(scratch, 'install.log');
const args = ['install', 'embedded-postgres@16.1.0', '--no-audit', '--no-fund', '--loglevel=error'];

const logFd = fs.openSync(logPath, 'a');
const child = spawn(npmCli, args, {
    cwd: scratch,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env: { ...process.env, npm_config_cache: path.join(scratch, '.npm-cache') },
});
child.unref();
console.log('NPM_INSTALL_PID=' + child.pid);
console.log('LOG=' + logPath);
setTimeout(() => process.exit(0), 2000);