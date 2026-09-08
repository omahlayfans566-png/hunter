import mongoose, { Document, Schema } from 'mongoose';

export interface ISourceHealth extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    sourceName: string;
    status: string;
    lastRunAt?: Date | null;
    lastSuccessAt?: Date | null;
    lastErrorAt?: Date | null;
    lastErrorMsg?: string | null;
    jobsFetched: number;
    jobsNew: number;
    jobsDuplicate: number;
    jobsExpired: number;
    jobsActive: number;
    createdAt: Date;
    updatedAt: Date;
}

const sourceHealthSchema = new Schema<ISourceHealth>(
    {
        sourceName: { type: String, required: true },
        status: { type: String, default: 'UNKNOWN' },
        lastRunAt: { type: Date, default: null },
        lastSuccessAt: { type: Date, default: null },
        lastErrorAt: { type: Date, default: null },
        lastErrorMsg: { type: String, default: null },
        jobsFetched: { type: Number, default: 0 },
        jobsNew: { type: Number, default: 0 },
        jobsDuplicate: { type: Number, default: 0 },
        jobsExpired: { type: Number, default: 0 },
        jobsActive: { type: Number, default: 0 },
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

sourceHealthSchema.index({ sourceName: 1 }, { unique: true });

export const SourceHealthModel = mongoose.model<ISourceHealth>('SourceHealth', sourceHealthSchema);
