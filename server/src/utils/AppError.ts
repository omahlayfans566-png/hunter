/**
 * Application-level error with an HTTP status code.
 * Throw this anywhere in the app to produce a clean JSON error response.
 */
export class AppError extends Error {
    constructor(
        public readonly message: string,
        public readonly statusCode: number = 500,
    ) {
        super(message);
        this.name = 'AppError';
        // Maintain proper stack trace in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}
