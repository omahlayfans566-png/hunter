import { Router } from 'express';
import { body } from 'express-validator';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import skillRoutes from './skill.routes';
import {
    EXPERIENCE_LEVELS,
    SPECIALIZATIONS,
    JOB_TYPES,
    WORK_PREFERENCES,
    SALARY_PERIODS,
    AVAILABILITIES,
    CURRENCY_MARKERS,
} from '../constants/profile';

const router = Router();

// All profile routes require authentication
router.use(authenticate);

// ── Mount skill sub-router ────────────────────────────────────────────
// Handles: GET/POST /api/profile/skills
//          PATCH/DELETE /api/profile/skills/:id
router.use('/skills', skillRoutes);

// ── GET /api/profile ─────────────────────────────────────────────────
router.get('/', profileController.getProfile);

// ── PUT /api/profile — create or replace the developer profile ────────
router.put(
    '/',
    [
        body('professionalTitle')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 100 }).withMessage('Professional title must be 100 characters or fewer.'),

        body('bio')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 1000 }).withMessage('Bio must be 1000 characters or fewer.'),

        body('yearsOfExperience')
            .optional({ nullable: true })
            .isInt({ min: 0, max: 60 }).withMessage('Years of experience must be between 0 and 60.'),

        body('experienceLevel')
            .optional({ nullable: true })
            .isIn(EXPERIENCE_LEVELS).withMessage('Invalid experience level.'),

        body('primarySpecialization')
            .optional({ nullable: true })
            .isIn(SPECIALIZATIONS).withMessage('Invalid specialization.'),

        body('secondarySpecializations')
            .optional()
            .isArray().withMessage('Secondary specializations must be an array.')
            .custom((arr: unknown[]) => arr.every((s) => SPECIALIZATIONS.includes(s as typeof SPECIALIZATIONS[number])))
            .withMessage('One or more secondary specializations are invalid.'),

        body('location')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 100 }).withMessage('Location must be 100 characters or fewer.'),

        body('country')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 100 }).withMessage('Country must be 100 characters or fewer.'),

        body('timezone')
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 60 }).withMessage('Timezone must be 60 characters or fewer.'),

        body('remoteWorldwide')
            .optional()
            .isBoolean().withMessage('remoteWorldwide must be true or false.'),

        body('preferredCountries')
            .optional()
            .isArray().withMessage('Preferred countries must be an array.'),

        body('preferredCities')
            .optional()
            .isArray().withMessage('Preferred cities must be an array.'),

        body('jobTypes')
            .optional()
            .isArray().withMessage('Job types must be an array.')
            .custom((arr: unknown[]) => arr.every((s) => JOB_TYPES.includes(s as typeof JOB_TYPES[number])))
            .withMessage('One or more job types are invalid.'),

        body('workPreferences')
            .optional()
            .isArray().withMessage('Work preferences must be an array.')
            .custom((arr: unknown[]) => arr.every((s) => WORK_PREFERENCES.includes(s as typeof WORK_PREFERENCES[number])))
            .withMessage('One or more work preferences are invalid.'),

        body('salaryMin')
            .optional({ nullable: true })
            .isInt({ min: 0 }).withMessage('Minimum salary must be a positive number.'),

        body('salaryMax')
            .optional({ nullable: true })
            .isInt({ min: 0 }).withMessage('Maximum salary must be a positive number.')
            .custom((max, { req }) => {
                const min = req.body?.salaryMin;
                if (min !== null && min !== undefined && max !== null && max !== undefined && max < min) {
                    throw new Error('Maximum salary must be greater than or equal to minimum salary.');
                }
                return true;
            }),

        body('currency')
            .optional({ nullable: true })
            .trim()
            .toUpperCase()
            .isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code (e.g. USD).')
            .isIn(CURRENCY_MARKERS).withMessage(`Supported currencies: ${CURRENCY_MARKERS.join(', ')}.`),

        body('salaryPeriod')
            .optional({ nullable: true })
            .isIn(SALARY_PERIODS).withMessage('Invalid salary period.'),

        body('availability')
            .optional({ nullable: true })
            .isIn(AVAILABILITIES).withMessage('Invalid availability.'),

        body('portfolioUrl')
            .optional({ nullable: true })
            .trim()
            .custom((val) => {
                if (!val) return true;
                try {
                    const url = new URL(val);
                    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
                    return true;
                } catch {
                    throw new Error('Portfolio URL must be a valid URL (https://...).');
                }
            }),
    ],
    validate,
    profileController.updateProfile,
);

// ── PATCH /api/profile — Phase 1 compatibility: first/last name ───────
router.patch(
    '/',
    [
        body('firstName')
            .optional()
            .trim()
            .notEmpty().withMessage('First name cannot be empty.')
            .isLength({ max: 50 }).withMessage('First name must be 50 characters or fewer.'),

        body('lastName')
            .optional()
            .trim()
            .notEmpty().withMessage('Last name cannot be empty.')
            .isLength({ max: 50 }).withMessage('Last name must be 50 characters or fewer.'),
    ],
    validate,
    profileController.updateNames,
);

export default router;
