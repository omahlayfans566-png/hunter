import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../lib/logger';
import { env } from '../config/env';

/**
 * Centralized error handler.
 * - Known AppErrors → return their statusCode + message.
 * - MongoDB duplicate key (code 11000) → 409 Conflict.
 * - MongoDB validation errors → 400.
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

    // MongoDB duplicate key error (unique index violation)
    if (
        err.name === 'MongoServerError' &&
        (err as unknown as { code?: number }).code === 11000
    ) {
        res.status(409).json({
            success: false,
            message: 'A record with that value already exists.',
        });
        return;
    }

    // Mongoose CastError — invalid ObjectId
    if (err.name === 'CastError') {
        res.status(400).json({
            success: false,
            message: 'Invalid ID format.',
        });
        return;
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
        res.status(400).json({
            success: false,
            message: 'Validation failed. Please check your input.',
        });
        return;
    }

    // Catch-all — never leak internal details
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
    });
}
