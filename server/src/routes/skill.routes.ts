import { Router } from 'express';
import { body, param } from 'express-validator';
import { skillController } from '../controllers/skill.controller';
import { validate } from '../middleware/validate';
import { SKILL_CATEGORIES, SKILL_PROFICIENCIES } from '../constants/profile';

const router = Router();

// ── GET /api/profile/skills ────────────────────────────────────────────────
router.get('/', skillController.listSkills);

// ── POST /api/profile/skills ───────────────────────────────────────────────
router.post(
    '/',
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Skill name is required.')
            .isLength({ max: 60 }).withMessage('Skill name must be 60 characters or fewer.'),

        body('proficiency')
            .isIn(SKILL_PROFICIENCIES).withMessage('Please select a valid proficiency level.'),

        body('category')
            .optional({ nullable: true })
            .trim()
            .isIn(SKILL_CATEGORIES).withMessage('Please select a valid skill category.'),
    ],
    validate,
    skillController.createSkill,
);

// ── PATCH /api/profile/skills/:id ──────────────────────────────────────────
router.patch(
    '/:id',
    [
        param('id').notEmpty().withMessage('Skill id is required.'),

        body('name')
            .optional({ values: 'falsy' })
            .trim()
            .notEmpty().withMessage('Skill name cannot be empty.')
            .isLength({ max: 60 }).withMessage('Skill name must be 60 characters or fewer.'),

        body('proficiency')
            .optional()
            .isIn(SKILL_PROFICIENCIES).withMessage('Please select a valid proficiency level.'),

        body('category')
            .optional({ nullable: true })
            .trim()
            .isIn(SKILL_CATEGORIES).withMessage('Please select a valid skill category.'),

        body().custom((_, { req }) => {
            const { name, proficiency, category } = req.body;
            if (name === undefined && proficiency === undefined && category === undefined) {
                throw new Error('Nothing to update.');
            }
            return true;
        }),
    ],
    validate,
    skillController.updateSkill,
);

// ── DELETE /api/profile/skills/:id ─────────────────────────────────────────
router.delete(
    '/:id',
    [param('id').notEmpty().withMessage('Skill id is required.')],
    validate,
    skillController.deleteSkill,
);

export default router;