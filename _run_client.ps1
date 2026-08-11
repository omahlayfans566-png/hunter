$ErrorActionPreference = 'Stop'
$root = 'c:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher'
$clientDir = Join-Path $root 'client'
$log = Join-Path $clientDir '_client.log'

$p = Start-Process -FilePath 'cmd.exe' `
    -WorkingDirectory $clientDir `
    -ArgumentList @('/c', 'npm run dev > _client.log 2>&1') `
    -WindowStyle Hidden `
    -PassThru

Write-Output ("Started vite dev as PID " + $p.Id)