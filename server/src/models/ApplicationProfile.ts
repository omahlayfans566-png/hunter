import mongoose, { Document, Schema } from 'mongoose';

export interface IApplicationProfile extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    phone?: string | null;
    education?: string | null;
    certifications: string[];
    workExperience?: unknown;
    portfolioDescription?: string | null;
    portfolioProjects: string[];
    githubUrl?: string | null;
    githubRepos: string[];
    linkedinUrl?: string | null;
    otherLinks: string[];
    createdAt: Date;
    updatedAt: Date;
}

const applicationProfileSchema = new Schema<IApplicationProfile>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        phone: { type: String, default: null },
        education: { type: String, default: null },
        certifications: { type: [String], default: [] },
        workExperience: { type: Schema.Types.Mixed, default: [] },
        portfolioDescription: { type: String, default: null },
        portfolioProjects: { type: [String], default: [] },
        githubUrl: { type: String, default: null },
        githubRepos: { type: [String], default: [] },
        linkedinUrl: { type: String, default: null },
        otherLinks: { type: [String], default: [] },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                ret.userId = ret.userId?.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

applicationProfileSchema.index({ userId: 1 }, { unique: true });

export const ApplicationProfileModel = mongoose.model<IApplicationProfile>('ApplicationProfile', applicationProfileSchema);
