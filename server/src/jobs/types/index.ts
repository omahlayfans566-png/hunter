import { JobStatus, RemoteType, ApplicationMethod, SalaryPeriod } from '@prisma/client';

// ── Normalized job shape (internal) ─────────────────────────────────────

export interface NormalizedJob {
    source: string;
    sourceJobId: string | null;
    title: string;
    companyName: string;
    companyUrl: string | null;
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
    errorMessage?: string;
    success: boolean;
}

// ── Job filter/search params ─────────────────────────────────────────────

export interface JobSearchParams {
    keyword?: string;
    remote?: boolean;
    country?: string;
    employmentType?: string;
    source?: string;
    status?: JobStatus;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'oldest' | 'company';
}
