import winston from 'winston';
import { env } from '../config/env';

const logger = winston.createLogger({
    level: env.isDev ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        env.isDev
            ? winston.format.colorize()
            : winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `[${timestamp}] ${level}: ${message}${metaStr}`;
        }),
    ),
    transports: [new winston.transports.Console()],
});

export default logger;
