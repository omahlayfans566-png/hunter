-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CLOSED', 'UNVERIFIED');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateIndex
CREATE INDEX "jobs_canonicalUrl_idx" ON "jobs"("canonicalUrl");

-- CreateIndex
CREATE INDEX "jobs_verificationStatus_idx" ON "jobs"("verificationStatus");

-- CreateIndex
CREATE INDEX "jobs_lastSeenAt_idx" ON "jobs"("lastSeenAt");
