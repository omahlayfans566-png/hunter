$ErrorActionPreference = 'Continue'
$scratch = Join-Path $env:TEMP 'jh-pg'
$stdout = Join-Path $scratch 'install.out.log'
$stderr = Join-Path $scratch 'install.err.log'
New-Item -ItemType Directory -Path $scratch -Force | Out-Null

$cmd = 'cd /d "%TEMP%\jh-pg" && call npm install embedded-postgres@16.14.0-beta.17 --no-audit --no-fund --loglevel=error'
$p = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/c', $cmd) `
    -WorkingDirectory $scratch `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -WindowStyle Hidden `
    -PassThru
Write-Output ("NPM_PID2=" + $p.Id)