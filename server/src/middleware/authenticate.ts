import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../types';

/**
 * Middleware that verifies the JWT from the HttpOnly cookie.
 * Attaches `req.user` on success; throws 401 on failure.
 */
export function authenticate(
    req: AuthRequest,
    _res: Response,
    next: NextFunction,
): void {
    try {
        const token: string | undefined = req.cookies?.token;

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
