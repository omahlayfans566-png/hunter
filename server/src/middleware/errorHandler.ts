import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../lib/logger';
import { env } from '../config/env';

/**
 * Centralized error handler.
 * - Known AppErrors → return their statusCode + message.
 * - Validation errors → 400 with user-friendly message.
 * - Everything else → 500, log internally, return a safe generic message.
 */
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // Log the full error internally — never expose stack traces to clients
    logger.error(err.message, {
        stack: env.isDev ? err.stack : undefined,
        name: err.name,
    });

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }

    // Handle Prisma known request errors generically
    if (err.name === 'PrismaClientKnownRequestError') {
        res.status(400).json({
            success: false,
            message: 'A database error occurred. Please try again.',
        });
        return;
    }

    // Catch-all — never leak internal details
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
    });
}
