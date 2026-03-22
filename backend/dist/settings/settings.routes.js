import { getDb } from '../db/database.js';
import { authGuard } from '../auth/auth.guard.js';
export async function settingsRoutes(app) {
    app.addHook('preHandler', authGuard);
    // Get all settings
    app.get('/api/settings', async () => {
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        for (const row of rows) {
            try {
                settings[row.key] = JSON.parse(row.value);
            }
            catch {
                settings[row.key] = row.value;
            }
        }
        return settings;
    });
    // Get single setting
    app.get('/api/settings/:key', async (request, reply) => {
        const { key } = request.params;
        const db = getDb();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        if (!row)
            return reply.status(404).send({ error: 'Impostazione non trovata' });
        try {
            return { key, value: JSON.parse(row.value) };
        }
        catch {
            return { key, value: row.value };
        }
    });
    // Upsert setting
    app.put('/api/settings/:key', async (request) => {
        const { key } = request.params;
        const { value } = request.body;
        const db = getDb();
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
            .run(key, serialized, serialized);
        return { message: 'Salvato' };
    });
}
//# sourceMappingURL=settings.routes.js.map