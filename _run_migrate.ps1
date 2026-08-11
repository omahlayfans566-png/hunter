$ErrorActionPreference = 'Continue'
$root = 'c:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher'
$serverDir = Join-Path $root 'server'
$log = Join-Path $serverDir '_migrate.log'

# Prisma needs the .env's DATABASE_URL or an env override pointing at the live test DB.
Remove-Item -LiteralPath $log -Force -ErrorAction SilentlyContinue
$cmd = 'set DATABASE_URL=postgresql://postgres:postgres@localhost:5433/job_hunter_dev&& npx prisma migrate dev --name add_developer_profile > _migrate.log 2>&1'

$p = Start-Process -FilePath 'cmd.exe' `
    -WorkingDirectory $serverDir `
    -ArgumentList @('/c', $cmd) `
    -WindowStyle Hidden `
    -PassThru

Write-Output ("Started migrate as PID " + $p.Id)