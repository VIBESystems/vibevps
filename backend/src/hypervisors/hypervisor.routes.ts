import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Agent, request as undiciRequest } from 'undici';
import { getDb } from '../db/database.js';
import { authGuard } from '../auth/auth.guard.js';
import { getAdapter, clearAdapterCache } from './hypervisor.service.js';

async function autoDetectNode(host: string, port: number, tokenId: string, tokenSecret: string): Promise<string> {
  const agent = new Agent({ connect: { rejectUnauthorized: false } });
  try {
    const { statusCode, body } = await undiciRequest(`https://${host}:${port}/api2/json/nodes`, {
      headers: { 'Authorization': `PVEAPIToken=${tokenId}=${tokenSecret}` },
      dispatcher: agent,
    });
    if (statusCode === 200) {
      const json = JSON.parse(await body.text());
      if (json.data?.length > 0) {
        return json.data[0].node;
      }
    }
  } catch { /* fallback */ }
  return 'pve';
}

const hypervisorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['proxmox', 'vmware']),
  host: z.string().min(1),
  port: z.number().int().positive().default(8006),
  node: z.string().default('pve'),
  api_token_id: z.string().min(1),
  api_token_secret: z.string().min(1),
  verify_ssl: z.boolean().default(false),
});

export async function hypervisorRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // List
  app.get('/api/hypervisors', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, type, host, port, node, is_active, created_at FROM hypervisors').all();
    return rows;
  });

  // Add
  app.post('/api/hypervisors', async (request, reply) => {
    const body = hypervisorSchema.parse(request.body);
    const db = getDb();

    // Auto-detect node name from Proxmox
    if (body.type === 'proxmox') {
      const detectedNode = await autoDetectNode(body.host, body.port, body.api_token_id, body.api_token_secret);
      body.node = detectedNode;
    }

    const result = db.prepare(
      'INSERT INTO hypervisors (name, type, host, port, node, api_token_id, api_token_secret, verify_ssl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(body.name, body.type, body.host, body.port, body.node, body.api_token_id, body.api_token_secret, body.verify_ssl ? 1 : 0);
    return { id: result.lastInsertRowid, node: body.node };
  });

  // Update
  app.put('/api/hypervisors/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = hypervisorSchema.partial().parse(request.body);
    const db = getDb();

    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (key === 'verify_ssl') {
        fields.push('verify_ssl = ?');
        values.push(value ? 1 : 0);
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    values.push(id);

    db.prepare(`UPDATE hypervisors SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    clearAdapterCache(Number(id));
    return { message: 'Aggiornato' };
  });

  // Delete
  app.delete('/api/hypervisors/:id', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    db.prepare('DELETE FROM hypervisors WHERE id = ?').run(id);
    clearAdapterCache(Number(id));
    return { message: 'Eliminato' };
  });

  // Test connection
  app.get('/api/hypervisors/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(id) as any;
    if (!hv) return reply.status(404).send({ error: 'Hypervisor non trovato' });

    try {
      clearAdapterCache(Number(id));
      const adapter = getAdapter(hv);
      const ok = await adapter.testConnection();
      if (ok) {
        const status = await adapter.getNodeStatus();
        return { connected: true, node: hv.node, hostname: status.hostname, version: status.version };
      }
      return { connected: false, error: 'Connessione fallita' };
    } catch (e: any) {
      return { connected: false, error: e.message };
    }
  });

  // Storages
  app.get('/api/hypervisors/:id/storages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(id) as any;
    if (!hv) return reply.status(404).send({ error: 'Hypervisor non trovato' });

    const adapter = getAdapter(hv);
    const storages = await adapter.listStorages();
    return storages;
  });

  // Node status
  app.get('/api/hypervisors/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(id) as any;
    if (!hv) return reply.status(404).send({ error: 'Hypervisor non trovato' });

    const adapter = getAdapter(hv);
    const status = await adapter.getNodeStatus();
    return status;
  });
}
