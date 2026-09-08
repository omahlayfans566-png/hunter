import { ApplicationStatus, ApplicationMethod, InterviewType } from '../../models/enums';

// ── Application profile input ───────────────────────────────────────────────

export interface WorkExperienceEntry {
    role: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
}

export interface ApplicationProfileInput {
    fullName?: string;
    email?: string;
    phone?: string | null;
    location?: string | null;
    professionalTitle?: string | null;
    professionalSummary?: string | null;
    yearsOfExperience?: number | null;
    skills?: { name: string; proficiency?: string; category?: string | null }[];
    education?: string | null;
    certifications?: string[];
    workExperience?: WorkExperienceEntry[];
    portfolioUrl?: string | null;
    portfolioDescription?: string | null;
    portfolioProjects?: string[];
    githubUrl?: string | null;
    githubRepos?: string[];
    linkedinUrl?: string | null;
    otherLinks?: string[];
}

// ── Tracker input ───────────────────────────────────────────────────────────

export interface CreateApplicationInput {
    jobId?: string | null;
    jobTitle?: string;
    companyName?: string;
    location?: string | null;
    source?: string;
    originalUrl?: string;
    applicationUrl?: string | null;
    applicationMethod?: ApplicationMethod;
    status?: ApplicationStatus;
    notes?: string | null;
    message?: string | null;
    cvId?: string | null;
    coverLetterId?: string | null;
    interviewDate?: Date | string | null;
    followUpDate?: Date | string | null;
    recruiterInfo?: string | null;
}

export interface UpdateApplicationInput {
    status?: ApplicationStatus;
    notes?: string | null;
    message?: string | null;
    cvId?: string | null;
    coverLetterId?: string | null;
    appliedAt?: Date | string | null;
    interviewDate?: Date | string | null;
    followUpDate?: Date | string | null;
    recruiterInfo?: string | null;
    jobTitle?: string;
    companyName?: string;
}

// ── Application list query ─────────────────────────────────────────────────

export interface ApplicationListQuery {
    status?: ApplicationStatus;
    company?: string;
    keyword?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

// ── Preparation output ─────────────────────────────────────────────────────

export interface PreparedAnalysis {
    matchScore: number;
    matchedSkills: { name: string; proficiency: string }[];
    missingSkills: string[];
    recommendedResume: { id: string; name: string; fileName: string; isCurrent: boolean } | null;
    recommendedProjects: string[];
    recommendedRepos: string[];
    relevantExperience: WorkExperienceEntry[];
    suggestedMessage: string;
    suggestedCoverLetter: string;
    usedProfile: {
        fullName: string | null;
        professionalTitle: string | null;
        portfolioUrl: string | null;
        githubUrl: string | null;
        location: string | null;
        email?: string | null;
    };
}

export interface InterviewInput {
    type?: InterviewType;
    scheduledAt: Date | string;
    location?: string | null;
    notes?: string | null;
}
