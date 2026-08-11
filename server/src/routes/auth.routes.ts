import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';

const router = Router();

// Rate limit auth endpoints — prevents brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        message: 'Too many attempts. Please wait 15 minutes and try again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── POST /api/auth/register ──────────────────────────────────────────
router.post(
    '/register',
    authLimiter,
    [
        body('firstName')
            .trim()
            .notEmpty().withMessage('First name is required.')
            .isLength({ max: 50 }).withMessage('First name must be 50 characters or fewer.'),

        body('lastName')
            .trim()
            .notEmpty().withMessage('Last name is required.')
            .isLength({ max: 50 }).withMessage('Last name must be 50 characters or fewer.'),

        body('email')
            .trim()
            .toLowerCase()
            .isEmail().withMessage('Please enter a valid email address.')
            .normalizeEmail(),

        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
            .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
            .matches(/[0-9]/).withMessage('Password must contain at least one number.'),

        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match.');
                }
                return true;
            }),
    ],
    validate,
    authController.register,
);

// ── POST /api/auth/login ─────────────────────────────────────────────
router.post(
    '/login',
    authLimiter,
    [
        body('email')
            .trim()
            .toLowerCase()
            .isEmail().withMessage('Please enter a valid email address.')
            .normalizeEmail(),

        body('password')
            .notEmpty().withMessage('Password is required.'),
    ],
    validate,
    authController.login,
);

// ── POST /api/auth/logout ────────────────────────────────────────────
router.post('/logout', authController.logout);

// ── GET /api/auth/me ─────────────────────────────────────────────────
router.get('/me', authenticate, authController.me);

export default router;
