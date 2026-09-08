// ── Shared enum string constants ─────────────────────────────────────────────
// Replaces @prisma/client enum imports throughout the codebase.
// These are plain TypeScript string unions — no database-level enforcement.
// Validation is handled by express-validator chains in the route files.

export const ExperienceLevel = {
    BEGINNER: 'BEGINNER',
    JUNIOR: 'JUNIOR',
    MID_LEVEL: 'MID_LEVEL',
    SENIOR: 'SENIOR',
    LEAD: 'LEAD',
} as const;
export type ExperienceLevel = (typeof ExperienceLevel)[keyof typeof ExperienceLevel];

export const Specialization = {
    FRONTEND: 'FRONTEND',
    BACKEND: 'BACKEND',
    FULL_STACK: 'FULL_STACK',
    MOBILE: 'MOBILE',
    DEVOPS_CLOUD: 'DEVOPS_CLOUD',
    SOFTWARE_ENGINEERING: 'SOFTWARE_ENGINEERING',
    OTHER: 'OTHER',
} as const;
export type Specialization = (typeof Specialization)[keyof typeof Specialization];

export const SkillCategory = {
    FRONTEND: 'FRONTEND',
    BACKEND: 'BACKEND',
    MOBILE: 'MOBILE',
    DATABASE: 'DATABASE',
    CLOUD_DEVOPS: 'CLOUD_DEVOPS',
    OTHER: 'OTHER',
} as const;
export type SkillCategory = (typeof SkillCategory)[keyof typeof SkillCategory];

export const SkillProficiency = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
    EXPERT: 'EXPERT',
} as const;
export type SkillProficiency = (typeof SkillProficiency)[keyof typeof SkillProficiency];

export const JobType = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACT',
    FREELANCE: 'FREELANCE',
    INTERNSHIP: 'INTERNSHIP',
    TEMPORARY: 'TEMPORARY',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const WorkPreference = {
    REMOTE: 'REMOTE',
    HYBRID: 'HYBRID',
    ON_SITE: 'ON_SITE',
} as const;
export type WorkPreference = (typeof WorkPreference)[keyof typeof WorkPreference];

export const SalaryPeriod = {
    HOURLY: 'HOURLY',
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
} as const;
export type SalaryPeriod = (typeof SalaryPeriod)[keyof typeof SalaryPeriod];

export const Availability = {
    IMMEDIATELY: 'IMMEDIATELY',
    WITHIN_2_WEEKS: 'WITHIN_2_WEEKS',
    WITHIN_1_MONTH: 'WITHIN_1_MONTH',
    MORE_THAN_1_MONTH: 'MORE_THAN_1_MONTH',
} as const;
export type Availability = (typeof Availability)[keyof typeof Availability];

export const JobStatus = {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    REMOVED: 'REMOVED',
    ERROR: 'ERROR',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const RemoteType = {
    REMOTE: 'REMOTE',
    HYBRID: 'HYBRID',
    ON_SITE: 'ON_SITE',
    UNKNOWN: 'UNKNOWN',
} as const;
export type RemoteType = (typeof RemoteType)[keyof typeof RemoteType];

export const ApplicationMethod = {
    DIRECT: 'DIRECT',
    EXTERNAL: 'EXTERNAL',
    MANUAL: 'MANUAL',
    UNKNOWN: 'UNKNOWN',
} as const;
export type ApplicationMethod = (typeof ApplicationMethod)[keyof typeof ApplicationMethod];

export const ApplicationStatus = {
    SAVED: 'SAVED',
    INTERESTED: 'INTERESTED',
    PREPARING: 'PREPARING',
    APPLIED: 'APPLIED',
    INTERVIEW: 'INTERVIEW',
    ASSESSMENT: 'ASSESSMENT',
    OFFER: 'OFFER',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN',
    CLOSED: 'CLOSED',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const InterviewType = {
    PHONE: 'PHONE',
    VIDEO: 'VIDEO',
    ONSITE: 'ONSITE',
    CODING_ASSESSMENT: 'CODING_ASSESSMENT',
    TECHNICAL: 'TECHNICAL',
    PANEL: 'PANEL',
    OTHER: 'OTHER',
} as const;
export type InterviewType = (typeof InterviewType)[keyof typeof InterviewType];

export const VerificationStatus = {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    CLOSED: 'CLOSED',
    UNVERIFIED: 'UNVERIFIED',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
