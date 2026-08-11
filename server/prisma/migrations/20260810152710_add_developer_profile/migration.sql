-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "Specialization" AS ENUM ('FRONTEND', 'BACKEND', 'FULL_STACK', 'MOBILE', 'DEVOPS_CLOUD', 'SOFTWARE_ENGINEERING', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('FRONTEND', 'BACKEND', 'MOBILE', 'DATABASE', 'CLOUD_DEVOPS', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillProficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "WorkPreference" AS ENUM ('REMOTE', 'HYBRID', 'ON_SITE');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('HOURLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IMMEDIATELY', 'WITHIN_2_WEEKS', 'WITHIN_1_MONTH', 'MORE_THAN_1_MONTH');

-- CreateTable
CREATE TABLE "developer_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalTitle" TEXT,
    "bio" TEXT,
    "yearsOfExperience" INTEGER,
    "experienceLevel" "ExperienceLevel",
    "primarySpecialization" "Specialization",
    "secondarySpecializations" "Specialization"[],
    "location" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "remoteWorldwide" BOOLEAN NOT NULL DEFAULT false,
    "preferredCountries" TEXT[],
    "preferredCities" TEXT[],
    "jobTypes" "JobType"[],
    "workPreferences" "WorkPreference"[],
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT,
    "salaryPeriod" "SalaryPeriod",
    "availability" "Availability",
    "portfolioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory",
    "proficiency" "SkillProficiency" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "developer_profiles_userId_key" ON "developer_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profile_skills_profileId_name_key" ON "profile_skills"("profileId", "name");

-- AddForeignKey
ALTER TABLE "developer_profiles" ADD CONSTRAINT "developer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
