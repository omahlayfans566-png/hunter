$ErrorActionPreference = 'Continue'
$root = Get-Location
$log = Join-Path $root '_pg-init.log'
$err = Join-Path $root '_pg-init-err.log'

$p = Start-Process -FilePath 'node.exe' `
    -WorkingDirectory $root `
    -ArgumentList @('_init_pg.cjs') `
    -RedirectStandardOutput $log `
    -RedirectStandardError $err `
    -WindowStyle Hidden `
    -PassThru
Write-Output ("PG_PID=" + $p.Id)