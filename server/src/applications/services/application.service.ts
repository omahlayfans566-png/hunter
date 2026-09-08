import mongoose from 'mongoose';
import { UserModel } from '../../models/User';
import { DeveloperProfileModel } from '../../models/DeveloperProfile';
import { ApplicationProfileModel } from '../../models/ApplicationProfile';
import { ResumeModel } from '../../models/Resume';
import { CoverLetterModel } from '../../models/CoverLetter';
import { JobApplicationModel } from '../../models/JobApplication';
import { InterviewModel } from '../../models/JobApplication';
import { JobModel } from '../../models/Job';
import { ApplicationStatus } from '../../models/enums';
import { AppError } from '../../utils/AppError';
import {
    ApplicationProfileInput,
    CreateApplicationInput,
    UpdateApplicationInput,
    ApplicationListQuery,
    InterviewInput,
    WorkExperienceEntry,
} from '../types';

// ── Date helpers ────────────────────────────────────────────────────────────

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function emptyToNull(value: string | null | undefined): string | null | undefined {
    if (value === undefined || value === null) return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function normalizeList(value: string[] | undefined): string[] | undefined {
    if (value === undefined) return undefined;
    return value.map((s) => s.trim()).filter((s) => s.length > 0);
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex <= 0) return { firstName: trimmed || 'Unknown', lastName: '' };
    return {
        firstName: trimmed.slice(0, spaceIndex),
        lastName: trimmed.slice(spaceIndex + 1).trim(),
    };
}

function idStr(id: unknown): string {
    return (id as { toString(): string }).toString();
}

// ── Helpers to shape populated documents ────────────────────────────────────

function shapeApplication(app: Record<string, unknown>) {
    if (!app) return app;
    const a = { ...app };
    if (a._id) { a.id = idStr(a._id); delete a._id; }
    if (a.__v !== undefined) delete a.__v;
    return a;
}

export const applicationService = {
    /** Combined payload for the Application Profile page. */
    async getCombinedProfile(userId: string) {
        const user = await UserModel.findById(userId).select('firstName lastName email').lean();
        if (!user) throw new AppError('User not found.', 404);

        const [applicationProfile, developerProfile, resumes, coverLetters] = await Promise.all([
            ApplicationProfileModel.findOne({ userId }).lean(),
            DeveloperProfileModel.findOne({ userId }).lean(),
            ResumeModel.find({ userId })
                .sort({ isCurrent: -1, updatedAt: -1 })
                .select('-fileData')
                .lean(),
            CoverLetterModel.find({ userId }).sort({ updatedAt: -1 }).lean(),
        ]);

        const shapeDoc = (d: Record<string, unknown> | null) => {
            if (!d) return null;
            const copy = { ...d, id: idStr(d._id) };
            delete (copy as Record<string, unknown>)._id;
            delete (copy as Record<string, unknown>).__v;
            return copy;
        };

        const shapedProfile = developerProfile
            ? {
                ...shapeDoc(developerProfile as Record<string, unknown>),
                skills: ((developerProfile as { skills?: Record<string, unknown>[] }).skills ?? []).map((s) => ({
                    id: idStr(s._id),
                    name: s.name,
                    category: s.category ?? null,
                    proficiency: s.proficiency,
                })),
            }
            : null;

        return {
            user: { id: idStr(user._id), firstName: user.firstName, lastName: user.lastName, email: user.email },
            applicationProfile: shapeDoc(applicationProfile as Record<string, unknown> | null),
            developerProfile: shapedProfile,
            resumes: (resumes as Record<string, unknown>[]).map((r) => ({ ...r, id: idStr(r._id), _id: undefined, __v: undefined })),
            coverLetters: (coverLetters as Record<string, unknown>[]).map((c) => ({ ...c, id: idStr(c._id), _id: undefined, __v: undefined })),
        };
    },

    /** Upsert the Phase 4 application profile, routing shared fields to existing models. */
    async upsertApplicationProfile(userId: string, input: ApplicationProfileInput) {
        const user = await UserModel.findById(userId).select('_id');
        if (!user) throw new AppError('User not found.', 404);

        // 1. Update identity on User record
        if (input.fullName) {
            const { firstName, lastName } = splitFullName(input.fullName);
            await UserModel.findByIdAndUpdate(userId, { $set: { firstName, lastName: lastName || undefined } });
        }
        if (input.email) {
            const email = input.email.trim().toLowerCase();
            const taken = await UserModel.findOne({ email, _id: { $ne: new mongoose.Types.ObjectId(userId) } });
            if (taken) throw new AppError('That email address is already in use.', 409);
            await UserModel.findByIdAndUpdate(userId, { $set: { email } });
        }

        // 2. Fields that live on DeveloperProfile
        const devData: Record<string, unknown> = {};
        if (input.location !== undefined) devData.location = emptyToNull(input.location) ?? null;
        if (input.professionalTitle !== undefined) devData.professionalTitle = emptyToNull(input.professionalTitle) ?? null;
        if (input.professionalSummary !== undefined) devData.bio = emptyToNull(input.professionalSummary) ?? null;
        if (input.yearsOfExperience !== undefined) devData.yearsOfExperience = input.yearsOfExperience;
        if (input.portfolioUrl !== undefined) devData.portfolioUrl = emptyToNull(input.portfolioUrl) ?? null;

        if (Object.keys(devData).length > 0) {
            await DeveloperProfileModel.findOneAndUpdate(
                { userId },
                { $set: devData },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            );
        }

        // 3. Replace the full skill set when provided
        if (input.skills) {
            const profile = await DeveloperProfileModel.findOneAndUpdate(
                { userId },
                { $setOnInsert: { userId } },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            );

            const newSkills = (input.skills ?? [])
                .map((s) => ({
                    _id: new mongoose.Types.ObjectId(),
                    name: s.name.trim(),
                    category: s.category ?? null,
                    proficiency: s.proficiency ?? 'INTERMEDIATE',
                }))
                .filter((s) => s.name.length > 0);

            await DeveloperProfileModel.findByIdAndUpdate(profile!._id, {
                $set: { skills: newSkills },
            });
        }

        // 4. Phase 4 fields on the application profile
        const appData: Record<string, unknown> = {};
        if (input.phone !== undefined) appData.phone = emptyToNull(input.phone) ?? null;
        if (input.education !== undefined) appData.education = emptyToNull(input.education) ?? null;
        if (input.certifications !== undefined)
            appData.certifications = normalizeList(input.certifications) ?? input.certifications;
        if (input.workExperience !== undefined) appData.workExperience = input.workExperience;
        if (input.portfolioDescription !== undefined)
            appData.portfolioDescription = emptyToNull(input.portfolioDescription) ?? null;
        if (input.portfolioProjects !== undefined)
            appData.portfolioProjects = normalizeList(input.portfolioProjects) ?? input.portfolioProjects;
        if (input.githubUrl !== undefined) appData.githubUrl = emptyToNull(input.githubUrl) ?? null;
        if (input.githubRepos !== undefined)
            appData.githubRepos = normalizeList(input.githubRepos) ?? input.githubRepos;
        if (input.linkedinUrl !== undefined) appData.linkedinUrl = emptyToNull(input.linkedinUrl) ?? null;
        if (input.otherLinks !== undefined)
            appData.otherLinks = normalizeList(input.otherLinks) ?? input.otherLinks;

        if (Object.keys(appData).length > 0) {
            await ApplicationProfileModel.findOneAndUpdate(
                { userId },
                { $set: appData },
                { new: true, upsert: true, setDefaultsOnInsert: true },
            );
        }

        return this.getCombinedProfile(userId);
    },

    // ── Resumes (CV) ─────────────────────────────────────────────────────────

    async listResumes(userId: string) {
        const docs = await ResumeModel.find({ userId })
            .sort({ isCurrent: -1, updatedAt: -1 })
            .select('-fileData')
            .lean();
        return docs.map((r) => ({ ...r, id: idStr(r._id), _id: undefined, __v: undefined }));
    },

    async createResume(
        userId: string,
        meta: { name: string; fileName: string; fileType: string; fileSize: number; makeCurrent: boolean },
        fileData: Buffer,
    ) {
        if (!meta.name.trim()) throw new AppError('Resume name is required.', 400);
        if (!fileData || fileData.length === 0) throw new AppError('Resume file is empty.', 400);

        // If making current, demote all others first
        if (meta.makeCurrent) {
            await ResumeModel.updateMany({ userId }, { $set: { isCurrent: false } });
        }

        const resume = await ResumeModel.create({
            userId,
            name: meta.name.trim(),
            fileName: meta.fileName,
            fileType: meta.fileType,
            fileSize: meta.fileSize,
            fileData,
            isCurrent: meta.makeCurrent,
        });

        return this.listResumes(userId);
    },

    async getResumeFile(userId: string, id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Resume not found.', 404);
        const resume = await ResumeModel.findOne({ _id: id, userId }).lean();
        if (!resume) throw new AppError('Resume not found.', 404);
        return {
            id: idStr(resume._id),
            fileName: resume.fileName,
            fileType: resume.fileType,
            fileData: resume.fileData,
        };
    },

    async updateResume(userId: string, id: string, input: { name?: string; isCurrent?: boolean }) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Resume not found.', 404);
        const owned = await ResumeModel.findOne({ _id: id, userId });
        if (!owned) throw new AppError('Resume not found.', 404);

        if (input.isCurrent === true) {
            await ResumeModel.updateMany({ userId }, { $set: { isCurrent: false } });
            await ResumeModel.findByIdAndUpdate(id, { $set: { isCurrent: true } });
            return this.listResumes(userId);
        }

        const setData: Record<string, unknown> = {};
        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name) throw new AppError('Resume name cannot be empty.', 400);
            setData.name = name;
        }
        if (Object.keys(setData).length > 0) {
            await ResumeModel.findByIdAndUpdate(id, { $set: setData });
        }
        return this.listResumes(userId);
    },

    async deleteResume(userId: string, id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Resume not found.', 404);
        const owned = await ResumeModel.findOne({ _id: id, userId });
        if (!owned) throw new AppError('Resume not found.', 404);
        await ResumeModel.findByIdAndDelete(id);
        return this.listResumes(userId);
    },

    // ── Cover letters ───────────────────────────────────────────────────────

    async listCoverLetters(userId: string) {
        const docs = await CoverLetterModel.find({ userId }).sort({ updatedAt: -1 }).lean();
        return docs.map((c) => ({ ...c, id: idStr(c._id), _id: undefined, __v: undefined }));
    },

    async createCoverLetter(userId: string, input: { name: string; content: string }) {
        if (!input.name.trim()) throw new AppError('Cover letter name is required.', 400);
        if (!input.content.trim()) throw new AppError('Cover letter content is required.', 400);
        const doc = await CoverLetterModel.create({
            userId,
            name: input.name.trim(),
            content: input.content,
        });
        return { ...doc.toJSON(), id: idStr(doc._id) };
    },

    async updateCoverLetter(userId: string, id: string, input: { name?: string; content?: string }) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Cover letter not found.', 404);
        const owned = await CoverLetterModel.findOne({ _id: id, userId });
        if (!owned) throw new AppError('Cover letter not found.', 404);

        const setData: Record<string, unknown> = {};
        if (input.name !== undefined) {
            if (!input.name.trim()) throw new AppError('Cover letter name cannot be empty.', 400);
            setData.name = input.name.trim();
        }
        if (input.content !== undefined) {
            if (!input.content.trim()) throw new AppError('Cover letter content cannot be empty.', 400);
            setData.content = input.content;
        }
        const updated = await CoverLetterModel.findByIdAndUpdate(id, { $set: setData }, { new: true }).lean();
        return updated ? { ...updated, id: idStr(updated._id), _id: undefined, __v: undefined } : null;
    },

    async deleteCoverLetter(userId: string, id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Cover letter not found.', 404);
        const owned = await CoverLetterModel.findOne({ _id: id, userId });
        if (!owned) throw new AppError('Cover letter not found.', 404);
        await CoverLetterModel.findByIdAndDelete(id);
        return this.listCoverLetters(userId);
    },

    // ── Application tracker ─────────────────────────────────────────────────

    async getApplications(userId: string, query: ApplicationListQuery) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 25));
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { userId };

        if (query.status) filter.status = query.status;
        if (query.source) filter.source = query.source;
        if (query.company) filter.companyName = { $regex: query.company, $options: 'i' };
        if (query.keyword) {
            const kw = query.keyword.trim();
            filter.$or = [
                { jobTitle: { $regex: kw, $options: 'i' } },
                { companyName: { $regex: kw, $options: 'i' } },
                { notes: { $regex: kw, $options: 'i' } },
            ];
        }
        if (query.dateFrom || query.dateTo) {
            const dateFilter: Record<string, Date> = {};
            if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
            if (query.dateTo) dateFilter.$lte = new Date(query.dateTo);
            filter.appliedAt = dateFilter;
        }

        const [docs, total] = await Promise.all([
            JobApplicationModel.find(filter)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('jobId', 'title companyName')
                .populate('cvId', 'name fileName')
                .populate('coverLetterId', 'name')
                .lean(),
            JobApplicationModel.countDocuments(filter),
        ]);

        const applications = (docs as Record<string, unknown>[]).map((app) => {
            const a = { ...app } as Record<string, unknown>;
            a.id = idStr(a._id);
            delete a._id;
            delete a.__v;

            // Normalise populated refs
            if (a.jobId && typeof a.jobId === 'object') {
                const j = a.jobId as Record<string, unknown>;
                a.job = { id: idStr(j._id), title: j.title, companyName: j.companyName };
                a.jobId = idStr(j._id);
            }
            if (a.cvId && typeof a.cvId === 'object') {
                const c = a.cvId as Record<string, unknown>;
                a.cv = { id: idStr(c._id), name: c.name, fileName: c.fileName };
                a.cvId = idStr(c._id);
            }
            if (a.coverLetterId && typeof a.coverLetterId === 'object') {
                const cl = a.coverLetterId as Record<string, unknown>;
                a.coverLetter = { id: idStr(cl._id), name: cl.name };
                a.coverLetterId = idStr(cl._id);
            }

            return a;
        });

        // Attach interviews for each application
        const appIds = applications.map((a) => (a as { id: string }).id);
        const interviews = await InterviewModel.find({
            applicationId: { $in: appIds.map((id) => new mongoose.Types.ObjectId(id)) },
        })
            .sort({ scheduledAt: 1 })
            .lean();

        const byAppId = new Map<string, unknown[]>();
        for (const iv of interviews) {
            const key = iv.applicationId.toString();
            if (!byAppId.has(key)) byAppId.set(key, []);
            byAppId.get(key)!.push({ ...iv, id: idStr(iv._id), _id: undefined, __v: undefined });
        }

        const result = applications.map((a) => ({
            ...a,
            interviews: byAppId.get((a as { id: string }).id) ?? [],
        }));

        return {
            applications: result,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        };
    },

    async getApplicationStats(userId: string) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [total, thisWeek, thisMonth, interviews, offers, rejections, pending] = await Promise.all([
            JobApplicationModel.countDocuments({ userId }),
            JobApplicationModel.countDocuments({ userId, createdAt: { $gte: weekAgo } }),
            JobApplicationModel.countDocuments({ userId, createdAt: { $gte: monthAgo } }),
            JobApplicationModel.countDocuments({ userId, status: ApplicationStatus.INTERVIEW }),
            JobApplicationModel.countDocuments({ userId, status: ApplicationStatus.OFFER }),
            JobApplicationModel.countDocuments({ userId, status: ApplicationStatus.REJECTED }),
            JobApplicationModel.countDocuments({
                userId,
                status: { $in: [ApplicationStatus.APPLIED, ApplicationStatus.ASSESSMENT, ApplicationStatus.INTERVIEW] },
            }),
        ]);

        return { total, thisWeek, thisMonth, interviews, offers, rejections, pending };
    },

    async getApplicationById(userId: string, id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Application not found.', 404);

        const app = await JobApplicationModel.findOne({ _id: id, userId })
            .populate('jobId', 'title companyName description')
            .populate('cvId', 'name fileName')
            .populate('coverLetterId', 'name content')
            .lean() as Record<string, unknown> | null;

        if (!app) throw new AppError('Application not found.', 404);

        const interviews = await InterviewModel.find({ applicationId: new mongoose.Types.ObjectId(id) })
            .sort({ scheduledAt: 1 })
            .lean();

        const shaped = { ...app } as Record<string, unknown>;
        shaped.id = idStr(shaped._id);
        delete shaped._id;
        delete shaped.__v;

        if (shaped.jobId && typeof shaped.jobId === 'object') {
            const j = shaped.jobId as Record<string, unknown>;
            shaped.job = { id: idStr(j._id), title: j.title, companyName: j.companyName, description: j.description };
            shaped.jobId = idStr(j._id);
        }
        if (shaped.cvId && typeof shaped.cvId === 'object') {
            const c = shaped.cvId as Record<string, unknown>;
            shaped.cv = { id: idStr(c._id), name: c.name, fileName: c.fileName };
            shaped.cvId = idStr(c._id);
        }
        if (shaped.coverLetterId && typeof shaped.coverLetterId === 'object') {
            const cl = shaped.coverLetterId as Record<string, unknown>;
            shaped.coverLetter = { id: idStr(cl._id), name: cl.name, content: cl.content };
            shaped.coverLetterId = idStr(cl._id);
        }

        return {
            ...shaped,
            interviews: interviews.map((iv) => ({ ...iv, id: idStr(iv._id), _id: undefined, __v: undefined })),
        };
    },

    async getApplicationForJob(userId: string, jobId: string) {
        if (!mongoose.Types.ObjectId.isValid(jobId)) return null;
        const app = await JobApplicationModel.findOne({ userId, jobId: new mongoose.Types.ObjectId(jobId) })
            .populate('cvId', 'name fileName')
            .populate('coverLetterId', 'name')
            .lean() as Record<string, unknown> | null;

        if (!app) return null;
        return { ...app, id: idStr(app._id), _id: undefined, __v: undefined };
    },

    async createApplication(userId: string, input: CreateApplicationInput) {
        const data: Record<string, unknown> = {
            userId,
            jobTitle: input.jobTitle ?? '',
            companyName: input.companyName ?? '',
            source: input.source ?? 'manual',
            originalUrl: input.originalUrl ?? '',
            status: input.status ?? ApplicationStatus.SAVED,
            notes: emptyToNull(input.notes) ?? null,
            message: emptyToNull(input.message) ?? null,
            cvId: input.cvId ? new mongoose.Types.ObjectId(input.cvId) : null,
            coverLetterId: input.coverLetterId ? new mongoose.Types.ObjectId(input.coverLetterId) : null,
            interviewDate: toDate(input.interviewDate),
            followUpDate: toDate(input.followUpDate),
            recruiterInfo: emptyToNull(input.recruiterInfo) ?? null,
        };

        if (input.jobId) {
            if (!mongoose.Types.ObjectId.isValid(input.jobId)) throw new AppError('Job not found.', 404);
            const job = await JobModel.findById(input.jobId).lean();
            if (!job) throw new AppError('Job not found. It may no longer be available.', 404);

            data.jobId = job._id;
            data.jobTitle = job.title;
            data.companyName = job.companyName;
            data.location = job.location;
            data.source = job.source;
            data.originalUrl = job.originalUrl;
            data.applicationUrl = job.applicationUrl;
            data.applicationMethod = job.applicationMethod;
        } else {
            const title = ((input.jobTitle ?? '') as string).trim();
            const company = ((input.companyName ?? '') as string).trim();
            if (!title || !company) {
                throw new AppError('Job title and company are required when not selecting a job.', 400);
            }
            data.jobTitle = title;
            data.companyName = company;
            data.location = emptyToNull(input.location) ?? null;
            data.source = ((input.source ?? '') as string).trim() || 'manual';
            data.originalUrl = ((input.originalUrl ?? '') as string).trim();
            data.applicationUrl = emptyToNull(input.applicationUrl) ?? null;
            data.applicationMethod = input.applicationMethod ?? 'EXTERNAL';
        }

        // Duplicate protection
        if (data.jobId) {
            const existing = await JobApplicationModel.findOne({
                userId,
                jobId: data.jobId,
            }).lean();
            if (existing) {
                throw new AppError(
                    'You already have this job in your tracker. Update its status instead of adding it again.',
                    409,
                );
            }
        } else if (data.originalUrl) {
            const byUrl = await JobApplicationModel.findOne({
                userId,
                originalUrl: data.originalUrl,
            }).lean();
            if (byUrl) {
                throw new AppError(
                    'You already have this job in your tracker. Update its status instead of adding it again.',
                    409,
                );
            }
        }

        if (data.cvId) {
            const cv = await ResumeModel.findOne({ _id: data.cvId, userId }).lean();
            if (!cv) throw new AppError('Selected resume does not exist.', 400);
        }
        if (data.coverLetterId) {
            const cl = await CoverLetterModel.findOne({ _id: data.coverLetterId, userId }).lean();
            if (!cl) throw new AppError('Selected cover letter does not exist.', 400);
        }

        try {
            const application = await JobApplicationModel.create(data);
            return this.getApplicationById(userId, application._id.toString());
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                'code' in (err as { code?: number }) &&
                (err as { code?: number }).code === 11000
            ) {
                throw new AppError(
                    'You already have this job in your tracker. Update its status instead of adding it again.',
                    409,
                );
            }
            throw err;
        }
    },

    /** Job-specific application preparation: analyse job vs saved profile. */
    async prepareApplication(userId: string, jobId: string) {
        if (!mongoose.Types.ObjectId.isValid(jobId)) throw new AppError('Job not found.', 404);
        const job = await JobModel.findById(jobId).lean();
        if (!job) throw new AppError('Job not found. It may no longer be available.', 404);

        const [profile, applicationProfile, resumes] = await Promise.all([
            DeveloperProfileModel.findOne({ userId }).lean(),
            ApplicationProfileModel.findOne({ userId }).lean(),
            ResumeModel.find({ userId }).sort({ isCurrent: -1, updatedAt: -1 }).select('-fileData').lean(),
        ]);

        const user = await UserModel.findById(userId).select('firstName lastName email').lean();

        const jobText = `${job.title} ${(job.tags ?? []).join(' ')} ${job.description}`.toLowerCase();
        const skills = (profile?.skills ?? []) as Array<{ name: string; proficiency: string }>;
        const matched: { name: string; proficiency: string }[] = [];
        const missing: string[] = [];

        for (const skill of skills) {
            const firstWord = skill.name.toLowerCase().split(' ')[0];
            if (jobText.includes(skill.name.toLowerCase()) || jobText.includes(firstWord)) {
                matched.push({ name: skill.name, proficiency: skill.proficiency });
            } else {
                missing.push(skill.name);
            }
        }

        const matchScore =
            skills.length > 0
                ? Math.min(100, Math.round((matched.length / skills.length) * 100))
                : Math.min(
                    60,
                    job.title.toLowerCase().includes('developer') ||
                        job.title.toLowerCase().includes('engineer')
                        ? 60
                        : 30,
                );

        const recommendedResume =
            (resumes as Array<{ isCurrent?: boolean; fileName: string; name: string; _id: unknown }>).find(
                (r) => r.isCurrent,
            ) ?? resumes[0] ?? null;

        const suggestedMessage = [
            `Hi${job.companyName ? ' ' + job.companyName + ' team' : ''},`,
            `I'm applying for the ${job.title} role. My background in ${matched
                .slice(0, 5)
                .map((s) => s.name)
                .join(', ') || 'software development'
            } aligns well with what you're looking for.`,
            'I would welcome the opportunity to discuss how I can contribute to your team.',
        ].join('\n');

        const suggestedCoverLetter = [
            'Dear Hiring Team,',
            '',
            `I am writing to apply for the ${job.title} position${job.companyName ? ' at ' + job.companyName : ''
            }.`,
            `With experience in ${matched
                .slice(0, 5)
                .map((s) => s.name)
                .join(', ') || 'software engineering'
            }, I believe I can make an immediate impact.`,
            'My portfolio and GitHub demonstrate hands-on, production-quality work.',
            '',
            'Thank you for your consideration.',
            user ? `${user.firstName} ${user.lastName}` : '',
        ].join('\n');

        const workExperience = ((applicationProfile?.workExperience ?? []) as unknown as WorkExperienceEntry[]);

        return {
            matchScore,
            matchedSkills: matched,
            missingSkills: missing.slice(0, 12),
            recommendedResume: recommendedResume
                ? {
                    id: idStr((recommendedResume as Record<string, unknown>)._id),
                    name: (recommendedResume as { name: string }).name,
                    fileName: (recommendedResume as { fileName: string }).fileName,
                    isCurrent: (recommendedResume as { isCurrent?: boolean }).isCurrent ?? false,
                }
                : null,
            recommendedProjects: applicationProfile?.portfolioProjects ?? [],
            recommendedRepos: applicationProfile?.githubRepos ?? [],
            relevantExperience: workExperience,
            suggestedMessage,
            suggestedCoverLetter,
            usedProfile: {
                fullName: user ? `${user.firstName} ${user.lastName}`.trim() : null,
                professionalTitle: profile?.professionalTitle ?? null,
                portfolioUrl: profile?.portfolioUrl ?? null,
                githubUrl: applicationProfile?.githubUrl ?? null,
                location: profile?.location ?? profile?.country ?? null,
                email: user?.email ?? null,
            },
        };
    },

    async updateApplication(userId: string, id: string, input: UpdateApplicationInput) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Application not found.', 404);
        const owned = await JobApplicationModel.findOne({ _id: id, userId }).select('_id status appliedAt').lean();
        if (!owned) throw new AppError('Application not found.', 404);

        const setData: Record<string, unknown> = {};

        if (input.status !== undefined) {
            setData.status = input.status;
            if (input.status === ApplicationStatus.APPLIED && !owned.appliedAt) {
                setData.appliedAt = new Date();
            }
        }
        if (input.appliedAt !== undefined) setData.appliedAt = toDate(input.appliedAt);
        if (input.notes !== undefined) setData.notes = emptyToNull(input.notes) ?? null;
        if (input.message !== undefined) setData.message = emptyToNull(input.message) ?? null;
        if (input.cvId !== undefined)
            setData.cvId = input.cvId ? new mongoose.Types.ObjectId(input.cvId) : null;
        if (input.coverLetterId !== undefined)
            setData.coverLetterId = input.coverLetterId ? new mongoose.Types.ObjectId(input.coverLetterId) : null;
        if (input.interviewDate !== undefined) setData.interviewDate = toDate(input.interviewDate);
        if (input.followUpDate !== undefined) setData.followUpDate = toDate(input.followUpDate);
        if (input.recruiterInfo !== undefined) setData.recruiterInfo = emptyToNull(input.recruiterInfo) ?? null;
        if (input.jobTitle !== undefined) setData.jobTitle = ((input.jobTitle ?? '') as string).trim() || 'Untitled';
        if (input.companyName !== undefined)
            setData.companyName = ((input.companyName ?? '') as string).trim() || 'Unknown company';

        if (input.cvId !== undefined && input.cvId) {
            const cv = await ResumeModel.findOne({ _id: input.cvId, userId }).lean();
            if (!cv) throw new AppError('Selected resume does not exist.', 400);
        }
        if (input.coverLetterId !== undefined && input.coverLetterId) {
            const cl = await CoverLetterModel.findOne({ _id: input.coverLetterId, userId }).lean();
            if (!cl) throw new AppError('Selected cover letter does not exist.', 400);
        }

        await JobApplicationModel.findByIdAndUpdate(id, { $set: setData });
        return this.getApplicationById(userId, id);
    },

    async deleteApplication(userId: string, id: string) {
        if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Application not found.', 404);
        const owned = await JobApplicationModel.findOne({ _id: id, userId }).lean();
        if (!owned) throw new AppError('Application not found.', 404);
        // Cascade delete interviews
        await InterviewModel.deleteMany({ applicationId: new mongoose.Types.ObjectId(id) });
        await JobApplicationModel.findByIdAndDelete(id);
    },

    // ── Interviews ──────────────────────────────────────────────────────────

    async createInterview(userId: string, applicationId: string, input: InterviewInput) {
        if (!mongoose.Types.ObjectId.isValid(applicationId))
            throw new AppError('Application not found.', 404);
        const owned = await JobApplicationModel.findOne({ _id: applicationId, userId }).lean();
        if (!owned) throw new AppError('Application not found.', 404);

        const scheduledAt = toDate(input.scheduledAt);
        if (!scheduledAt) throw new AppError('A valid interview date is required.', 400);

        const iv = await InterviewModel.create({
            applicationId: new mongoose.Types.ObjectId(applicationId),
            type: input.type ?? 'VIDEO',
            scheduledAt,
            location: emptyToNull(input.location) ?? null,
            notes: emptyToNull(input.notes) ?? null,
        });

        return { ...iv.toJSON(), id: idStr(iv._id) };
    },

    async updateInterview(userId: string, interviewId: string, input: InterviewInput) {
        if (!mongoose.Types.ObjectId.isValid(interviewId))
            throw new AppError('Interview not found.', 404);

        const iv = await InterviewModel.findById(interviewId).lean();
        if (!iv) throw new AppError('Interview not found.', 404);

        // Verify ownership via the application
        const owned = await JobApplicationModel.findOne({
            _id: iv.applicationId,
            userId,
        }).lean();
        if (!owned) throw new AppError('Interview not found.', 404);

        const setData: Record<string, unknown> = {};
        if (input.type !== undefined) setData.type = input.type;
        if (input.scheduledAt !== undefined) {
            const d = toDate(input.scheduledAt);
            if (!d) throw new AppError('A valid interview date is required.', 400);
            setData.scheduledAt = d;
        }
        if (input.location !== undefined) setData.location = emptyToNull(input.location) ?? null;
        if (input.notes !== undefined) setData.notes = emptyToNull(input.notes) ?? null;

        const updated = await InterviewModel.findByIdAndUpdate(
            interviewId,
            { $set: setData },
            { new: true },
        ).lean();

        return updated
            ? { ...updated, id: idStr(updated._id), _id: undefined, __v: undefined }
            : null;
    },

    async deleteInterview(userId: string, interviewId: string) {
        if (!mongoose.Types.ObjectId.isValid(interviewId))
            throw new AppError('Interview not found.', 404);

        const iv = await InterviewModel.findById(interviewId).lean();
        if (!iv) throw new AppError('Interview not found.', 404);

        const owned = await JobApplicationModel.findOne({
            _id: iv.applicationId,
            userId,
        }).lean();
        if (!owned) throw new AppError('Interview not found.', 404);

        await InterviewModel.findByIdAndDelete(interviewId);
    },
};
