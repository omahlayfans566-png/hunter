import './config/env'; // Load and validate env vars first
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './config/env';
import logger from './lib/logger';
import { connectDB, disconnectDB } from './lib/mongoose';
import { errorHandler } from './middleware/errorHandler';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import jobRoutes from './jobs/routes/job.routes';
import applicationRoutes from './applications/routes/application.routes';
import { startRefreshScheduler } from './jobs/scheduler';

const app = express();

// ── Security headers ───────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────
app.use(
    cors({
        origin: env.clientUrl,
        credentials: true, // allow cookies cross-origin
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);

// ── Body parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Cookie parsing ─────────────────────────────────────────────────
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);

// ── 404 handler ────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler (must be last) ────────────────────────────
app.use(errorHandler);

// ── Start server ───────────────────────────────────────────────────
async function bootstrap() {
    try {
        await connectDB();

        app.listen(env.port, () => {
            logger.info(`Server running on http://localhost:${env.port} [${env.nodeEnv}]`);
        });

        // Start the automatic job-refresh loop (respects provider rate limits).
        startRefreshScheduler();
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    await disconnectDB();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    await disconnectDB();
    process.exit(0);
});

bootstrap();
