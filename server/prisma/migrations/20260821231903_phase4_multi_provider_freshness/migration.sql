-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "matchScore" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "source_health" ADD COLUMN     "jobsActive" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "jobsExpired" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "jobs_lastVerifiedAt_idx" ON "jobs"("lastVerifiedAt");

-- CreateIndex
CREATE INDEX "jobs_sourceJobId_idx" ON "jobs"("sourceJobId");

-- CreateIndex
CREATE INDEX "jobs_country_idx" ON "jobs"("country");

-- CreateIndex
CREATE INDEX "jobs_location_idx" ON "jobs"("location");

-- CreateIndex
CREATE INDEX "jobs_title_idx" ON "jobs"("title");

-- CreateIndex
CREATE INDEX "jobs_matchScore_idx" ON "jobs"("matchScore");
