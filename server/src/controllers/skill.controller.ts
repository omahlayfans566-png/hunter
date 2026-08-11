import { Response, NextFunction } from 'express';
import { skillService } from '../services/skill.service';
import { AuthRequest } from '../types';

export const skillController = {
    async listSkills(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const data = await skillService.listSkills(userId);
            res.status(200).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    },

    async createSkill(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { name, proficiency, category } = req.body;
            const data = await skillService.createSkill(userId, { name, proficiency, category });
            res.status(201).json({ success: true, message: 'Skill added.', data });
        } catch (err) {
            next(err);
        }
    },

    async updateSkill(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const skillId = req.params.id;
            const { name, proficiency, category } = req.body;
            const data = await skillService.updateSkill(userId, skillId, { name, proficiency, category });
            res.status(200).json({ success: true, message: 'Skill updated.', data });
        } catch (err) {
            next(err);
        }
    },

    async deleteSkill(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const skillId = req.params.id;
            const data = await skillService.deleteSkill(userId, skillId);
            res.status(200).json({ success: true, message: 'Skill removed.', data });
        } catch (err) {
            next(err);
        }
    },
};