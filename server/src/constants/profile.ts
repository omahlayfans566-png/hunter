// Shared enum value lists for validation — single source of truth.
// Values mirror the Prisma enums in schema.prisma.

export const EXPERIENCE_LEVELS = ['BEGINNER', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD'] as const;

export const SPECIALIZATIONS = [
    'FRONTEND',
    'BACKEND',
    'FULL_STACK',
    'MOBILE',
    'DEVOPS_CLOUD',
    'SOFTWARE_ENGINEERING',
    'OTHER',
] as const;

export const SKILL_CATEGORIES = ['FRONTEND', 'BACKEND', 'MOBILE', 'DATABASE', 'CLOUD_DEVOPS', 'OTHER'] as const;

export const SKILL_PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export const JOB_TYPES = [
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'FREELANCE',
    'INTERNSHIP',
    'TEMPORARY',
] as const;

export const WORK_PREFERENCES = ['REMOTE', 'HYBRID', 'ON_SITE'] as const;

export const SALARY_PERIODS = ['HOURLY', 'MONTHLY', 'YEARLY'] as const;

export const AVAILABILITIES = ['IMMEDIATELY', 'WITHIN_2_WEEKS', 'WITHIN_1_MONTH', 'MORE_THAN_1_MONTH'] as const;

export const CURRENCY_MARKERS = ['USD', 'GBP', 'EUR', 'NGN'] as const;