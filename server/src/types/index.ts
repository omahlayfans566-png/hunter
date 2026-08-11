import { Request } from 'express';

// Authenticated request — user payload is attached by the auth middleware
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
    };
}

// Standard API response shape
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
}

// JWT payload
export interface JwtPayload {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
}
