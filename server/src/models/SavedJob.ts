import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedJob extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    jobId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const savedJobSchema = new Schema<ISavedJob>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                ret.userId = ret.userId?.toString();
                ret.jobId = ret.jobId?.toString();
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

// One save per user per job
savedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });
savedJobSchema.index({ userId: 1, createdAt: -1 });

export const SavedJobModel = mongoose.model<ISavedJob>('SavedJob', savedJobSchema);
