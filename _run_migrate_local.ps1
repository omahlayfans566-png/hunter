$ErrorActionPreference = 'Continue'
$serverDir = 'C:\Users\DELL\OneDrive\Desktop\web dev\job-fetcher\server'
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/job_hunter_dev'
$env:DIRECT_URL = 'postgresql://postgres:postgres@localhost:5433/job_hunter_dev'
Push-Location $serverDir
npx prisma migrate dev --name phase4_multi_provider_freshness 2>&1 | Out-File -FilePath '_migrate2.log' -Encoding utf8
npx prisma generate 2>&1 | Out-File -FilePath '_generate2.log' -Encoding utf8
Pop-Location
Write-Output 'MIGRATE_DONE'