import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../types';

/**
 * Middleware that verifies the JWT from either:
 *  1. The HttpOnly cookie named "token"  (dev + same-origin prod)
 *  2. The Authorization: Bearer <token> header  (cross-origin prod)
 *
 * The header takes precedence when both are present. This makes the
 * middleware work reliably in all production environments regardless of
 * whether the browser passes cross-origin SameSite=None cookies.
 */
export function authenticate(
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
): void {
    try {
        // 1. Try Authorization: Bearer <token> header first
        let token: string | undefined;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.slice(7).trim();
        }

        // 2. Fall back to HttpOnly cookie
        if (!token) {
            token = req.cookies?.token;
        }

        if (!token) {
            throw new AppError('Authentication required. Please log in.', 401);
        }

        const payload = verifyToken(token);
        req.user = { userId: payload.userId, email: payload.email };
        next();
    } catch (err) {
        if (err instanceof AppError) {
            next(err);
        } else {
            next(new AppError('Authentication required. Please log in.', 401));
        }
    }
}
