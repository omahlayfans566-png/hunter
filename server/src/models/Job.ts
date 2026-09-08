import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    source: string;
    sourceJobId?: string | null;
    title: string;
    companyName: string;
    companyUrl?: string | null;
    companyLogo?: string | null;
    description: string;
    location?: string | null;
    country?: string | null;
    remoteType: string;
    employmentType?: string | null;
    tags: string[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    salaryPeriod?: string | null;
    salaryRaw?: string | null;
    applicationUrl?: string | null;
    originalUrl: string;
    applicationMethod: string;
    status: string;
    postedAt?: Date | null;
    discoveredAt: Date;
    lastCheckedAt: Date;
    canonicalUrl?: string | null;
    sources: string[];
    verificationStatus: string;
    lastSeenAt?: Date | null;
    lastVerifiedAt?: Date | null;
    matchScore: number;
    createdAt: Date;
    updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
    {
        source: { type: String, required: true },
        sourceJobId: { type: String, default: null },
        title: { type: String, required: true },
        companyName: { type: String, required: true },
        companyUrl: { type: String, default: null },
        companyLogo: { type: String, default: null },
        description: { type: String, required: true },
        location: { type: String, default: null },
        country: { type: String, default: null },
        remoteType: { type: String, default: 'UNKNOWN' },
        employmentType: { type: String, default: null },
        tags: { type: [String], default: [] },
        salaryMin: { type: Number, default: null },
        salaryMax: { type: Number, default: null },
        salaryCurrency: { type: String, default: null },
        salaryPeriod: { type: String, default: null },
        salaryRaw: { type: String, default: null },
        applicationUrl: { type: String, default: null },
        originalUrl: { type: String, required: true },
        applicationMethod: { type: String, default: 'EXTERNAL' },
        status: { type: String, default: 'ACTIVE' },
        postedAt: { type: Date, default: null },
        discoveredAt: { type: Date, default: Date.now },
        lastCheckedAt: { type: Date, default: Date.now },
        canonicalUrl: { type: String, default: null },
        sources: { type: [String], default: [] },
        verificationStatus: { type: String, default: 'UNVERIFIED' },
        lastSeenAt: { type: Date, default: null },
        lastVerifiedAt: { type: Date, default: null },
        matchScore: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
jobSchema.index({ source: 1, sourceJobId: 1 }, { unique: true, sparse: true });
jobSchema.index({ status: 1 });
jobSchema.index({ source: 1 });
jobSchema.index({ remoteType: 1 });
jobSchema.index({ postedAt: -1 });
jobSchema.index({ companyName: 1 });
jobSchema.index({ discoveredAt: -1 });
jobSchema.index({ canonicalUrl: 1 });
jobSchema.index({ verificationStatus: 1 });
jobSchema.index({ lastSeenAt: -1 });
jobSchema.index({ lastVerifiedAt: -1 });
jobSchema.index({ sourceJobId: 1 });
jobSchema.index({ country: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ matchScore: -1 });
jobSchema.index({ originalUrl: 1 });

// Text index for full-text keyword search
jobSchema.index(
    { title: 'text', companyName: 'text', description: 'text', tags: 'text' },
    { name: 'job_text_search', weights: { title: 10, companyName: 5, tags: 5, description: 1 } },
);

export const JobModel = mongoose.model<IJob>('Job', jobSchema);
