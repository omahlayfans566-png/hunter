$ErrorActionPreference = 'Stop'
$root = 'c:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher'
$log = Join-Path $root '_pg-init.log'
$err = Join-Path $root '_pg-init-err.log'

$p = Start-Process -FilePath 'node.exe' `
    -WorkingDirectory $root `
    -ArgumentList @('_init_pg.cjs') `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err `
    -WindowStyle Hidden `
    -PassThru

Write-Output ("Started PG init as PID " + $p.Id)