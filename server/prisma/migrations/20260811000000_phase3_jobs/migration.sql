-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED', 'ERROR');

-- CreateEnum
CREATE TYPE "RemoteType" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ApplicationMethod" AS ENUM ('DIRECT', 'EXTERNAL', 'MANUAL', 'UNKNOWN');

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceJobId" TEXT,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyUrl" TEXT,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "country" TEXT,
    "remoteType" "RemoteType" NOT NULL DEFAULT 'UNKNOWN',
    "employmentType" TEXT,
    "tags" TEXT[],
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "salaryPeriod" "SalaryPeriod",
    "salaryRaw" TEXT,
    "applicationUrl" TEXT,
    "originalUrl" TEXT NOT NULL,
    "applicationMethod" "ApplicationMethod" NOT NULL DEFAULT 'EXTERNAL',
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "postedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_health" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMsg" TEXT,
    "jobsFetched" INTEGER NOT NULL DEFAULT 0,
    "jobsNew" INTEGER NOT NULL DEFAULT 0,
    "jobsDuplicate" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "source_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_source_sourceJobId_key" ON "jobs"("source", "sourceJobId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_source_idx" ON "jobs"("source");

-- CreateIndex
CREATE INDEX "jobs_remoteType_idx" ON "jobs"("remoteType");

-- CreateIndex
CREATE INDEX "jobs_postedAt_idx" ON "jobs"("postedAt");

-- CreateIndex
CREATE INDEX "jobs_companyName_idx" ON "jobs"("companyName");

-- CreateIndex
CREATE INDEX "jobs_discoveredAt_idx" ON "jobs"("discoveredAt");

-- CreateIndex
CREATE UNIQUE INDEX "source_health_sourceName_key" ON "source_health"("sourceName");
