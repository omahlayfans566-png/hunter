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

// ── Phase 3: Job types ────────────────────────────────────────────────────

export type JobStatus = 'ACTIVE' | 'EXPIRED' | 'REMOVED' | 'ERROR';
export type RemoteType = 'REMOTE' | 'HYBRID' | 'ON_SITE' | 'UNKNOWN';
export type ApplicationMethod = 'DIRECT' | 'EXTERNAL' | 'MANUAL' | 'UNKNOWN';

export interface Job {
    id: string;
    source: string;
    sources?: string[];
    title: string;
    companyName: string;
    location: string | null;
    country: string | null;
    remoteType: RemoteType;
    employmentType: string | null;
    tags: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: SalaryPeriod | null;
    salaryRaw: string | null;
    applicationUrl: string | null;
    originalUrl: string;
    applicationMethod: ApplicationMethod;
    status: JobStatus;
    verificationStatus?: VerificationStatus;
    lastVerifiedAt?: string | null;
    matchScore?: number | null;
    postedAt: string | null;
    discoveredAt: string;
}

export type VerificationStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'UNVERIFIED';

export interface JobDetail extends Job {
    description: string;
    companyUrl: string | null;
    sourceJobId: string | null;
    lastCheckedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface JobSearchResponse {
    jobs: Job[];
    pagination: JobPagination;
}

export interface JobStats {
    total: number;
    active: number;
    remote: number;
    today: number;
}

export interface SourceHealth {
    id: string;
    sourceName: string;
    status: string;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastErrorMsg: string | null;
    jobsFetched: number;
    jobsNew: number;
    jobsDuplicate: number;
    jobsActive?: number;
}

export interface SourceStatus {
    sourceName: string;
    status: 'WORKING' | 'UNAVAILABLE' | 'CONFIG_REQUIRED' | 'UNKNOWN';
    message: string;
    requiresConfig: boolean;
    configKeys?: string[];
}

export interface IngestionResult {
    source: string;
    fetched: number;
    saved: number;
    duplicates: number;
    errors: number;
    errorMessage?: string;
    success: boolean;
}

export interface IngestionResponse {
    results: IngestionResult[];
    summary: { totalFetched: number; totalNew: number; totalDupes: number };
}

export const REMOTE_TYPE_LABELS: Record<RemoteType, string> = {
    REMOTE: 'Remote',
    HYBRID: 'Hybrid',
    ON_SITE: 'On-site',
    UNKNOWN: 'Unknown',
};

export const APPLICATION_METHOD_LABELS: Record<ApplicationMethod, string> = {
    DIRECT: 'Direct',
    EXTERNAL: 'External',
    MANUAL: 'Manual',
    UNKNOWN: 'Unknown',
};

// ── Saved Jobs ─────────────────────────────────────────────────────────────

export interface SavedJobEntry {
    savedJobId: string;
    savedAt: string;
    job: Job;
}

// ── JobFilters (mirrors client/src/services/job.service.ts JobFilters) ────

export interface JobFilters {
    keyword?: string;
    remote?: boolean;
    country?: string;
    location?: string;
    employmentType?: string;
    source?: string;
    newToday?: boolean;
    activeNow?: boolean;
    postedWithin?: number;
    sortBy?: 'newest' | 'oldest' | 'company' | 'relevance';
    page?: number;
    limit?: number;
}

// ── Dashboard stats ────────────────────────────────────────────────────────

export interface DashboardStats {
    activeJobs: number;
    newToday: number;
    remoteJobs: number;
    savedJobs: number;
    applications: number;
    interviews: number;
}
