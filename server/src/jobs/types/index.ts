import { JobStatus, RemoteType, ApplicationMethod, SalaryPeriod, VerificationStatus } from '../../models/enums';

// ── Normalized job shape (internal) ─────────────────────────────────────

export interface NormalizedJob {
    source: string;
    sourceJobId: string | null;
    title: string;
    companyName: string;
    companyUrl: string | null;
    companyLogo?: string | null;
    description: string;
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
    postedAt: Date | null;
    // Set by the ingestion pipeline (not by providers) when not provided.
    canonicalUrl?: string | null;
    lastSeenAt?: Date | null;
    /** Some providers carry explicit evidence (e.g. USAJobs application close date). */
    verificationStatus?: VerificationStatus;
    /** 0-100 relevance to the user's saved developer profile, set by ingestion. */
    matchScore?: number | null;
}

// ── Source interface ─────────────────────────────────────────────────────

export interface JobSourceResult {
    jobs: NormalizedJob[];
    error?: string;
}

export interface JobSource {
    readonly sourceName: string;
    fetchJobs(keywords?: string[]): Promise<JobSourceResult>;
    getStatus(): SourceStatusInfo;
}

export interface SourceStatusInfo {
    sourceName: string;
    status: 'WORKING' | 'UNAVAILABLE' | 'CONFIG_REQUIRED' | 'UNKNOWN';
    message: string;
    requiresConfig: boolean;
    configKeys?: string[];
}

// ── Ingestion result ─────────────────────────────────────────────────────

export interface IngestionResult {
    source: string;
    fetched: number;
    saved: number;
    duplicates: number;
    errors: number;
    expired: number;
    skipped: boolean;
    errorMessage?: string;
    success: boolean;
}

// ── Job filter/search params ─────────────────────────────────────────────

export interface JobSearchParams {
    keyword?: string;
    remote?: boolean;
    country?: string;
    location?: string;
    employmentType?: string;
    source?: string;
    status?: JobStatus;
    /** NEW TODAY — postedAt is today (according to the source). */
    newToday?: boolean;
    /** ACTIVE NOW — has recent verification/confirmation evidence. */
    activeNow?: boolean;
    /** POSTED WITHIN — jobs posted within N days (1=24h, 3, 7, 14, 30). */
    postedWithin?: number;
    /** User ID for personalised match scoring in search results. */
    userId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'oldest' | 'company' | 'relevance';
}
