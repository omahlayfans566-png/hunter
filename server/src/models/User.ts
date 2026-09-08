import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUser>(
    {
        email: { type: String, required: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
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
                delete ret.passwordHash;
            },
        },
        toObject: { virtuals: true },
    },
);

userSchema.index({ email: 1 }, { unique: true });

export const UserModel = mongoose.model<IUser>('User', userSchema);
