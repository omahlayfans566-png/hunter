import api from './api';
import {
    JobSearchResponse, JobDetail, JobStats,
    SourceHealth, SourceStatus, IngestionResponse, SavedJobEntry, Job,
} from '../types';

export interface JobFilters {
    keyword?: string;
    remote?: boolean;
    country?: string;
    location?: string;
    employmentType?: string;
    source?: string;
    newToday?: boolean;
    activeNow?: boolean;
    /** Number of days: 1, 3, 7, 14, 30 */
    postedWithin?: number;
    sortBy?: 'newest' | 'oldest' | 'company' | 'relevance';
    page?: number;
    limit?: number;
}

export async function searchJobs(filters: JobFilters = {}): Promise<JobSearchResponse> {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.remote !== undefined) params.set('remote', String(filters.remote));
    if (filters.country) params.set('country', filters.country);
    if (filters.location) params.set('location', filters.location);
    if (filters.employmentType) params.set('employmentType', filters.employmentType);
    if (filters.source) params.set('source', filters.source);
    if (filters.newToday) params.set('newToday', 'true');
    if (filters.activeNow) params.set('activeNow', 'true');
    if (filters.postedWithin) params.set('postedWithin', String(filters.postedWithin));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const res = await api.get(`/jobs?${params.toString()}`);
    return res.data.data as JobSearchResponse;
}

export async function getCountries(): Promise<string[]> {
    const res = await api.get('/jobs/countries');
    return res.data.data.countries as string[];
}

export async function getJobById(id: string): Promise<JobDetail> {
    const res = await api.get(`/jobs/${id}`);
    return res.data.data.job as JobDetail;
}

export async function getJobStats(): Promise<JobStats> {
    const res = await api.get('/jobs/stats');
    return res.data.data.stats as JobStats;
}

export async function getSourceHealth(): Promise<{ health: SourceHealth[]; sources: SourceStatus[] }> {
    const res = await api.get('/jobs/sources');
    return res.data.data as { health: SourceHealth[]; sources: SourceStatus[] };
}

export async function triggerIngestion(source?: string): Promise<IngestionResponse> {
    const params = source ? `?source=${source}` : '';
    const res = await api.post(`/jobs/ingest${params}`);
    return res.data.data as IngestionResponse;
}

export async function getTopMatches(limit = 10): Promise<Job[]> {
    const res = await api.get(`/jobs/top-matches?limit=${limit}`);
    return res.data.data.jobs as Job[];
}

// ── Saved Jobs ────────────────────────────────────────────────────────────────

export async function saveJob(jobId: string): Promise<{ saved: boolean; savedJobId: string }> {
    const res = await api.post(`/jobs/${jobId}/save`);
    return res.data.data;
}

export async function unsaveJob(jobId: string): Promise<void> {
    await api.delete(`/jobs/${jobId}/save`);
}

export async function getSavedJobs(): Promise<{ savedJobs: SavedJobEntry[]; total: number }> {
    const res = await api.get('/jobs/saved');
    return res.data.data;
}
