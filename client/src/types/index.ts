// ── Base user (Phase 1) ───────────────────────────────────────────────────
export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    updatedAt?: string;
}

// ── Enums (mirror server-side Prisma enums) ───────────────────────────────
export type ExperienceLevel = 'BEGINNER' | 'JUNIOR' | 'MID_LEVEL' | 'SENIOR' | 'LEAD';

export type Specialization =
    | 'FRONTEND'
    | 'BACKEND'
    | 'FULL_STACK'
    | 'MOBILE'
    | 'DEVOPS_CLOUD'
    | 'SOFTWARE_ENGINEERING'
    | 'OTHER';

export type SkillCategory = 'FRONTEND' | 'BACKEND' | 'MOBILE' | 'DATABASE' | 'CLOUD_DEVOPS' | 'OTHER';

export type SkillProficiency = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'TEMPORARY';

export type WorkPreference = 'REMOTE' | 'HYBRID' | 'ON_SITE';

export type SalaryPeriod = 'HOURLY' | 'MONTHLY' | 'YEARLY';

export type Availability =
    | 'IMMEDIATELY'
    | 'WITHIN_2_WEEKS'
    | 'WITHIN_1_MONTH'
    | 'MORE_THAN_1_MONTH';

// ── Skill ─────────────────────────────────────────────────────────────────
export interface Skill {
    id: string;
    name: string;
    category: SkillCategory | null;
    proficiency: SkillProficiency;
}

// ── Developer Profile (Phase 2) ───────────────────────────────────────────
export interface DeveloperProfile {
    id: string;
    userId: string;
    professionalTitle: string | null;
    bio: string | null;
    yearsOfExperience: number | null;
    experienceLevel: ExperienceLevel | null;
    primarySpecialization: Specialization | null;
    secondarySpecializations: Specialization[];
    location: string | null;
    country: string | null;
    timezone: string | null;
    remoteWorldwide: boolean;
    preferredCountries: string[];
    preferredCities: string[];
    jobTypes: JobType[];
    workPreferences: WorkPreference[];
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    salaryPeriod: SalaryPeriod | null;
    availability: Availability | null;
    portfolioUrl: string | null;
    skills: Skill[];
    completion: number;
    createdAt: string;
    updatedAt: string;
}

// ── Combined profile API response ─────────────────────────────────────────
export interface ProfileResponse {
    user: User;
    profile: DeveloperProfile | null;
}

// ── Developer profile form data (sent to PUT /api/profile) ───────────────
export interface DeveloperProfileInput {
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    experienceLevel?: ExperienceLevel | null;
    primarySpecialization?: Specialization | null;
    secondarySpecializations?: Specialization[];
    location?: string | null;
    country?: string | null;
    timezone?: string | null;
    remoteWorldwide?: boolean;
    preferredCountries?: string[];
    preferredCities?: string[];
    jobTypes?: JobType[];
    workPreferences?: WorkPreference[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string | null;
    salaryPeriod?: SalaryPeriod | null;
    availability?: Availability | null;
    portfolioUrl?: string | null;
}

// ── Auth state ────────────────────────────────────────────────────────────
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
    status: AuthStatus;
    user: User | null;
}

// ── Generic API response ──────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

// ── Display label helpers ─────────────────────────────────────────────────
export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
    BEGINNER: 'Beginner',
    JUNIOR: 'Junior',
    MID_LEVEL: 'Mid-Level',
    SENIOR: 'Senior',
    LEAD: 'Lead',
};

export const SPECIALIZATION_LABELS: Record<Specialization, string> = {
    FRONTEND: 'Frontend Development',
    BACKEND: 'Backend Development',
    FULL_STACK: 'Full Stack Development',
    MOBILE: 'Mobile Development',
    DEVOPS_CLOUD: 'DevOps / Cloud',
    SOFTWARE_ENGINEERING: 'Software Engineering',
    OTHER: 'Other',
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
    FULL_TIME: 'Full-time',
    PART_TIME: 'Part-time',
    CONTRACT: 'Contract',
    FREELANCE: 'Freelance',
    INTERNSHIP: 'Internship',
    TEMPORARY: 'Temporary',
};

export const WORK_PREFERENCE_LABELS: Record<WorkPreference, string> = {
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
    ON_SITE: 'On-site',
};

export const SKILL_PROFICIENCY_LABELS: Record<SkillProficiency, string> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
    EXPERT: 'Expert',
};

export const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    MOBILE: 'Mobile',
    DATABASE: 'Database',
    CLOUD_DEVOPS: 'Cloud / DevOps',
    OTHER: 'Other',
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
    IMMEDIATELY: 'Immediately',
    WITHIN_2_WEEKS: 'Within 2 weeks',
    WITHIN_1_MONTH: 'Within 1 month',
    MORE_THAN_1_MONTH: 'More than 1 month',
};

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
    HOURLY: 'per hour',
    MONTHLY: 'per month',
    YEARLY: 'per year',
};

// ── Constant option lists for dropdowns ──────────────────────────────────
export const EXPERIENCE_LEVELS: ExperienceLevel[] = ['BEGINNER', 'JUNIOR', 'MID_LEVEL', 'SENIOR', 'LEAD'];
export const SPECIALIZATIONS: Specialization[] = [
    'FRONTEND', 'BACKEND', 'FULL_STACK', 'MOBILE', 'DEVOPS_CLOUD', 'SOFTWARE_ENGINEERING', 'OTHER',
];
export const JOB_TYPES: JobType[] = [
    'FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY',
];
export const WORK_PREFERENCES: WorkPreference[] = ['REMOTE', 'HYBRID', 'ON_SITE'];
export const SKILL_PROFICIENCIES: SkillProficiency[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
export const SKILL_CATEGORIES: SkillCategory[] = [
    'FRONTEND', 'BACKEND', 'MOBILE', 'DATABASE', 'CLOUD_DEVOPS', 'OTHER',
];
export const AVAILABILITIES: Availability[] = [
    'IMMEDIATELY', 'WITHIN_2_WEEKS', 'WITHIN_1_MONTH', 'MORE_THAN_1_MONTH',
];
export const CURRENCIES = ['USD', 'GBP', 'EUR', 'NGN'] as const;
export const SALARY_PERIODS: SalaryPeriod[] = ['HOURLY', 'MONTHLY', 'YEARLY'];
