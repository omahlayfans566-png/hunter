import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import { UserModel } from '../models';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: !env.isDev,           // HTTPS in production
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const authController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const { firstName, lastName, email, password } = req.body;
            const { user, token } = await authService.register({
                firstName,
                lastName,
                email,
                password,
            });

            res.cookie('token', token, COOKIE_OPTIONS);

            res.status(201).json({
                success: true,
                message: 'Account created successfully.',
                data: { user },
            });
        } catch (err) {
            next(err);
        }
    },

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            const { user, token } = await authService.login({ email, password });

            res.cookie('token', token, COOKIE_OPTIONS);

            res.status(200).json({
                success: true,
                message: 'Logged in successfully.',
                data: { user },
            });
        } catch (err) {
            next(err);
        }
    },

    async logout(_req: Request, res: Response, next: NextFunction) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: !env.isDev,
                sameSite: 'lax',
            });

            res.status(200).json({
                success: true,
                message: 'Logged out successfully.',
            });
        } catch (err) {
            next(err);
        }
    },

    async me(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;

            const user = await UserModel.findById(userId).select(
                'firstName lastName email createdAt',
            );

            if (!user) {
                res.clearCookie('token');
                res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: user._id.toString(),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        createdAt: user.createdAt,
                    },
                },
            });
        } catch (err) {
            next(err);
        }
    },
};
