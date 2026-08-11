import * as argon2 from 'argon2';
import prisma from '../lib/prisma';
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

export const authService = {
    async register(input: RegisterInput) {
        const { firstName, lastName, email, password } = input;

        // Check for existing account
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new AppError('An account with this email already exists.', 409);
        }

        // Hash password — argon2id is the recommended variant
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
        });

        const user = await prisma.user.create({
            data: { firstName, lastName, email, passwordHash },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                createdAt: true,
            },
        });

        const token = signToken({ userId: user.id, email: user.email });
        return { user, token };
    },

    async login(input: LoginInput) {
        const { email, password } = input;

        const user = await prisma.user.findUnique({ where: { email } });

        // Use the same error message regardless of whether the email exists
        // to prevent user-enumeration attacks
        if (!user) {
            throw new AppError('Invalid email or password.', 401);
        }

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) {
            throw new AppError('Invalid email or password.', 401);
        }

        const safeUser = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            createdAt: user.createdAt,
        };

        const token = signToken({ userId: user.id, email: user.email });
        return { user: safeUser, token };
    },
};
