import { randomBytes } from 'crypto';
export const config = {
    port: Number(process.env.PORT || 3001),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
    jwtExpiration: '8h',
    dbPath: process.env.DB_PATH || new URL('../../data/vibevps.db', import.meta.url).pathname,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    encryptionKey: process.env.ENCRYPTION_KEY || randomBytes(32).toString('hex'),
};
//# sourceMappingURL=config.js.map