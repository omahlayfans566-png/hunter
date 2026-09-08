$ErrorActionPreference = 'Continue'
$serverDir = 'C:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher\server'
$out = Join-Path $serverDir '_ingest-test.out.log'
$err = Join-Path $serverDir '_ingest-test.err.log'
$cmd = 'node node_modules\tsx\dist\cli.mjs scripts\test-ingestion.ts'
$p = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/c', $cmd) `
    -WorkingDirectory $serverDir `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -WindowStyle Hidden `
    -PassThru
Write-Output ("TEST_PID=" + $p.Id)