import api from './api';

export type AppStatus = 'SAVED' | 'INTERESTED' | 'PREPARING' | 'APPLIED' | 'INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'REJECTED' | 'WITHDRAWN' | 'CLOSED';

export interface AppSummary {
    id: string;
    jobId: string | null;
    jobTitle: string;
    companyName: string;
    location: string | null;
    source: string;
    originalUrl: string;
    applicationUrl: string | null;
    applicationMethod: string;
    status: AppStatus;
    appliedAt: string | null;
    notes: string | null;
    interviewDate: string | null;
    followUpDate: string | null;
    recruiterInfo: string | null;
    createdAt: string;
    updatedAt: string;
    cv: { id: string; name: string; fileName: string } | null;
    coverLetter: { id: string; name: string } | null;
    interviews: Interview[];
}

export interface Interview {
    id: string;
    type: string;
    scheduledAt: string;
    location: string | null;
    notes: string | null;
}

export interface AppStats {
    total: number;
    thisWeek: number;
    thisMonth: number;
    interviews: number;
    offers: number;
    rejections: number;
    pending: number;
}

export interface ResumeMeta {
    id: string;
    name: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    isCurrent: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CoverLetter {
    id: string;
    name: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export const applicationService = {
    async getApplications(params?: { status?: string; keyword?: string; page?: number; limit?: number }) {
        const q = new URLSearchParams();
        if (params?.status) q.set('status', params.status);
        if (params?.keyword) q.set('keyword', params.keyword);
        if (params?.page) q.set('page', String(params.page));
        if (params?.limit) q.set('limit', String(params.limit));
        const res = await api.get(`/applications?${q.toString()}`);
        return res.data.data;
    },

    async getStats(): Promise<AppStats> {
        const res = await api.get('/applications/stats');
        return res.data.data as AppStats;
    },

    async getApplicationById(id: string): Promise<AppSummary> {
        const res = await api.get(`/applications/${id}`);
        return res.data.data as AppSummary;
    },

    async getApplicationForJob(jobId: string): Promise<AppSummary | null> {
        const res = await api.get(`/applications/for-job/${jobId}`);
        return res.data.data as AppSummary | null;
    },

    async createApplication(data: {
        jobId?: string;
        jobTitle?: string;
        companyName?: string;
        originalUrl?: string;
        status?: AppStatus;
        notes?: string;
        cvId?: string;
        coverLetterId?: string;
    }): Promise<AppSummary> {
        const res = await api.post('/applications', data);
        return res.data.data as AppSummary;
    },

    async updateApplication(id: string, data: {
        status?: AppStatus;
        notes?: string;
        appliedAt?: string;
        interviewDate?: string;
        followUpDate?: string;
        recruiterInfo?: string;
        cvId?: string;
        coverLetterId?: string;
    }): Promise<AppSummary> {
        const res = await api.patch(`/applications/${id}`, data);
        return res.data.data as AppSummary;
    },

    async deleteApplication(id: string): Promise<void> {
        await api.delete(`/applications/${id}`);
    },

    async prepareApplication(jobId: string) {
        const res = await api.get(`/applications/prepare/${jobId}`);
        return res.data.data;
    },

    // ── Resumes ───────────────────────────────────────────────────────────────
    async listResumes(): Promise<ResumeMeta[]> {
        const res = await api.get('/applications/resumes');
        return res.data.data as ResumeMeta[];
    },

    async uploadResume(name: string, file: File, makeCurrent: boolean): Promise<ResumeMeta[]> {
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
        const res = await api.post('/applications/resumes', {
            meta: { name, fileName: file.name, fileType: file.type, fileSize: file.size, makeCurrent },
            fileData: base64,
        });
        return res.data.data as ResumeMeta[];
    },

    getResumeDownloadUrl(id: string): string {
        return `/api/applications/resumes/${id}/file`;
    },

    async updateResume(id: string, data: { name?: string; isCurrent?: boolean }): Promise<ResumeMeta[]> {
        const res = await api.patch(`/applications/resumes/${id}`, data);
        return res.data.data as ResumeMeta[];
    },

    async deleteResume(id: string): Promise<ResumeMeta[]> {
        const res = await api.delete(`/applications/resumes/${id}`);
        return res.data.data as ResumeMeta[];
    },

    // ── Cover letters ─────────────────────────────────────────────────────────
    async listCoverLetters(): Promise<CoverLetter[]> {
        const res = await api.get('/applications/cover-letters');
        return res.data.data as CoverLetter[];
    },

    async createCoverLetter(name: string, content: string): Promise<CoverLetter> {
        const res = await api.post('/applications/cover-letters', { name, content });
        return res.data.data as CoverLetter;
    },

    async updateCoverLetter(id: string, data: { name?: string; content?: string }): Promise<CoverLetter> {
        const res = await api.patch(`/applications/cover-letters/${id}`, data);
        return res.data.data as CoverLetter;
    },

    async deleteCoverLetter(id: string): Promise<CoverLetter[]> {
        const res = await api.delete(`/applications/cover-letters/${id}`);
        return res.data.data as CoverLetter[];
    },

    // ── Application profile ───────────────────────────────────────────────────
    async getApplicationProfile() {
        const res = await api.get('/applications/profile');
        return res.data.data;
    },

    async saveApplicationProfile(data: Record<string, unknown>) {
        const res = await api.put('/applications/profile', data);
        return res.data.data;
    },
};
