import { Response, NextFunction } from 'express';
import { profileService, UpdateDeveloperProfileInput } from '../services/profile.service';
import { AuthRequest } from '../types';

export const profileController = {
    /** GET /api/profile — user + developer profile (with skills + completion). */
    async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const data = await profileService.getProfile(userId);
            res.status(200).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    },

    /** PUT /api/profile — create/update the developer profile (upsert). */
    async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const profile = await profileService.upsertProfile(userId, req.body as UpdateDeveloperProfileInput);
            res.status(200).json({
                success: true,
                message: 'Profile saved successfully.',
                data: { profile },
            });
        } catch (err) {
            next(err);
        }
    },

    /** PATCH /api/profile — Phase 1 compatibility: update first/last name. */
    async updateNames(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { firstName, lastName } = req.body;
            const user = await profileService.updateNames(userId, { firstName, lastName });
            res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                data: { user },
            });
        } catch (err) {
            next(err);
        }
    },
};