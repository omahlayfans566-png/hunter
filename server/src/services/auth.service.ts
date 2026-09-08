import * as argon2 from 'argon2';
import { UserModel } from '../models';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

interface RegisterInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

function safeUser(user: { _id: unknown; firstName: string; lastName: string; email: string; createdAt: Date }) {
    return {
        id: (user._id as { toString(): string }).toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt,
    };
}

export const authService = {
    async register(input: RegisterInput) {
        const { firstName, lastName, email, password } = input;

        // Check for existing account
        const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            throw new AppError('An account with this email already exists.', 409);
        }

        // Hash password — argon2id is the recommended variant
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
        });

        const user = await UserModel.create({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            passwordHash,
        });

        const token = signToken({ userId: user._id.toString(), email: user.email });
        return { user: safeUser(user), token };
    },

    async login(input: LoginInput) {
        const { email, password } = input;

        // Fetch with passwordHash (excluded from default toJSON transform)
        const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

        // Use the same error message regardless of whether the email exists
        // to prevent user-enumeration attacks
        if (!user) {
            throw new AppError('Invalid email or password.', 401);
        }

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) {
            throw new AppError('Invalid email or password.', 401);
        }

        const token = signToken({ userId: user._id.toString(), email: user.email });
        return { user: safeUser(user), token };
    },
};
