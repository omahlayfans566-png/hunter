import mongoose, { Document, Schema } from 'mongoose';

export interface IProfileSkill {
    _id: mongoose.Types.ObjectId;
    id?: string;
    name: string;
    category?: string | null;
    proficiency: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IDeveloperProfile extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    professionalTitle?: string | null;
    bio?: string | null;
    yearsOfExperience?: number | null;
    experienceLevel?: string | null;
    primarySpecialization?: string | null;
    secondarySpecializations: string[];
    location?: string | null;
    country?: string | null;
    timezone?: string | null;
    remoteWorldwide: boolean;
    preferredCountries: string[];
    preferredCities: string[];
    jobTypes: string[];
    workPreferences: string[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency?: string | null;
    salaryPeriod?: string | null;
    availability?: string | null;
    portfolioUrl?: string | null;
    skills: IProfileSkill[];
    createdAt: Date;
    updatedAt: Date;
}

const profileSkillSchema = new Schema<IProfileSkill>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, default: null },
        proficiency: { type: String, required: true, default: 'INTERMEDIATE' },
    },
    { timestamps: true, _id: true },
);

profileSkillSchema.set('toJSON', {
    virtuals: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transform(_doc, ret: any) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
    },
});

const developerProfileSchema = new Schema<IDeveloperProfile>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        professionalTitle: { type: String, default: null },
        bio: { type: String, default: null },
        yearsOfExperience: { type: Number, default: null },
        experienceLevel: { type: String, default: null },
        primarySpecialization: { type: String, default: null },
        secondarySpecializations: { type: [String], default: [] },
        location: { type: String, default: null },
        country: { type: String, default: null },
        timezone: { type: String, default: null },
        remoteWorldwide: { type: Boolean, default: false },
        preferredCountries: { type: [String], default: [] },
        preferredCities: { type: [String], default: [] },
        jobTypes: { type: [String], default: [] },
        workPreferences: { type: [String], default: [] },
        salaryMin: { type: Number, default: null },
        salaryMax: { type: Number, default: null },
        currency: { type: String, default: null },
        salaryPeriod: { type: String, default: null },
        availability: { type: String, default: null },
        portfolioUrl: { type: String, default: null },
        skills: { type: [profileSkillSchema], default: [] },
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

developerProfileSchema.index({ userId: 1 }, { unique: true });

export const DeveloperProfileModel = mongoose.model<IDeveloperProfile>('DeveloperProfile', developerProfileSchema);
