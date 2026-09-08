import mongoose, { Document, Schema } from 'mongoose';

export interface ICoverLetter extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    userId: mongoose.Types.ObjectId;
    name: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

const coverLetterSchema = new Schema<ICoverLetter>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true },
        content: { type: String, required: true },
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

coverLetterSchema.index({ userId: 1 });

export const CoverLetterModel = mongoose.model<ICoverLetter>('CoverLetter', coverLetterSchema);
