import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { authGuard } from './auth.guard.js';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const db = getDb();

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(body.username) as any;
    if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ id: user.id, username: user.username, role: user.role });
    return { token, user: { id: user.id, username: user.username, role: user.role } };
  });

  app.post('/api/auth/change-password', { preHandler: authGuard }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    const db = getDb();
    const userId = (request.user as any).id;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user || !bcrypt.compareSync(body.currentPassword, user.password_hash)) {
      return reply.status(400).send({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(body.newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
    return { message: 'Password updated' };
  });

  app.get('/api/auth/me', { preHandler: authGuard }, async (request) => {
    return request.user;
  });
}
