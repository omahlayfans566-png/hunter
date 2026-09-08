import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
    _id: mongoose.Types.ObjectId;
    id?: string;
    applicationId: mongoose.Types.ObjectId;
    type: string;
    scheduledAt: Date;
    location?: string | null;
    notes?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface IJobApplication extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    jobId?: mongoose.Types.ObjectId | null;
    status: string;
    jobTitle: string;
    companyName: string;
    location?: string | null;
    source: string;
    originalUrl: string;
    applicationUrl?: string | null;
    applicationMethod: string;
    appliedAt?: Date | null;
    cvId?: mongoose.Types.ObjectId | null;
    coverLetterId?: mongoose.Types.ObjectId | null;
    message?: string | null;
    notes?: string | null;
    interviewDate?: Date | null;
    followUpDate?: Date | null;
    recruiterInfo?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ── Interview Schema ─────────────────────────────────────────────────────────
const interviewSchema = new Schema<IInterview>(
    {
        applicationId: { type: Schema.Types.ObjectId, ref: 'JobApplication', required: true },
        type: { type: String, default: 'VIDEO' },
        scheduledAt: { type: Date, required: true },
        location: { type: String, default: null },
        notes: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                ret.applicationId = ret.applicationId?.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

interviewSchema.index({ applicationId: 1 });

// ── JobApplication Schema ────────────────────────────────────────────────────
const jobApplicationSchema = new Schema<IJobApplication>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        jobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null },
        status: { type: String, default: 'SAVED' },
        jobTitle: { type: String, required: true },
        companyName: { type: String, required: true },
        location: { type: String, default: null },
        source: { type: String, required: true, default: 'manual' },
        originalUrl: { type: String, default: '' },
        applicationUrl: { type: String, default: null },
        applicationMethod: { type: String, default: 'UNKNOWN' },
        appliedAt: { type: Date, default: null },
        cvId: { type: Schema.Types.ObjectId, ref: 'Resume', default: null },
        coverLetterId: { type: Schema.Types.ObjectId, ref: 'CoverLetter', default: null },
        message: { type: String, default: null },
        notes: { type: String, default: null },
        interviewDate: { type: Date, default: null },
        followUpDate: { type: Date, default: null },
        recruiterInfo: { type: String, default: null },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                ret.userId = ret.userId?.toString();
                ret.jobId = ret.jobId?.toString() ?? null;
                ret.cvId = ret.cvId?.toString() ?? null;
                ret.coverLetterId = ret.coverLetterId?.toString() ?? null;
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

jobApplicationSchema.index(
    { userId: 1, jobId: 1 },
    { unique: true, sparse: true, partialFilterExpression: { jobId: { $ne: null } } },
);
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, appliedAt: -1 });

export const InterviewModel = mongoose.model<IInterview>('Interview', interviewSchema);
export const JobApplicationModel = mongoose.model<IJobApplication>('JobApplication', jobApplicationSchema);
