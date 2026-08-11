import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Singleton Prisma client — reused across the application
const prisma = new PrismaClient({
    log: env.isDev ? ['error', 'warn'] : ['error'],
});

export default prisma;
