$ErrorActionPreference = 'Continue'
$root = 'c:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher'
$serverDir = Join-Path $root 'server'

$cmd = 'npx prisma generate > _generate.log 2>&1'
$p = Start-Process -FilePath 'cmd.exe' `
    -WorkingDirectory $serverDir `
    -ArgumentList @('/c', $cmd) `
    -WindowStyle Hidden `
    -PassThru
Write-Output ("Started prisma generate as PID " + $p.Id)