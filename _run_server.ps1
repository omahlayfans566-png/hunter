$ErrorActionPreference = 'Stop'
$root = 'c:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher'
$serverDir = Join-Path $root 'server'
$log = Join-Path $root '_server.log'
$err = Join-Path $root '_server-err.log'

$cmd = 'set DATABASE_URL=postgresql://postgres:postgres@localhost:5433/job_hunter_dev&& node dist/app.js > _server.log 2>&1'

$p = Start-Process -FilePath 'cmd.exe' `
    -WorkingDirectory $serverDir `
    -ArgumentList @('/c', $cmd) `
    -WindowStyle Hidden `
    -PassThru

Write-Output ("Started server as PID " + $p.Id)