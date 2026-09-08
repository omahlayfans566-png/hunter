import mongoose, { Document, Schema } from 'mongoose';

export interface IResume extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    name: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileData: Buffer;
    isCurrent: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true },
        fileName: { type: String, required: true },
        fileType: { type: String, required: true },
        fileSize: { type: Number, required: true },
        fileData: { type: Buffer, required: true },
        isCurrent: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                ret.id = ret._id?.toString();
                ret.userId = ret.userId?.toString();
                delete ret.fileData; // never expose raw bytes via JSON
                delete ret._id;
                delete ret.__v;
            },
        },
        toObject: { virtuals: true },
    },
);

resumeSchema.index({ userId: 1 });
resumeSchema.index({ userId: 1, isCurrent: -1 });

export const ResumeModel = mongoose.model<IResume>('Resume', resumeSchema);
