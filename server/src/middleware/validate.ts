import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Runs after express-validator chains.
 * Collects all validation errors and returns 400 if any exist.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const messages = errors
            .array()
            .map((e) => e.msg)
            .join('. ');

        res.status(400).json({
            success: false,
            message: messages,
        });
        return;
    }

    next();
}
