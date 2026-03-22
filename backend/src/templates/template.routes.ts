import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { authGuard } from '../auth/auth.guard.js';
import { getAdapter } from '../hypervisors/hypervisor.service.js';

const templateSchema = z.object({
  hypervisor_id: z.number().int(),
  source_vm_id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  default_cores: z.number().int().min(1).default(2),
  default_memory_mb: z.number().int().min(512).default(2048),
  default_disk_gb: z.number().int().min(5).default(20),
  os_type: z.string().optional(),
});

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // List saved templates
  app.get('/api/templates', async () => {
    const db = getDb();
    return db.prepare(`
      SELECT t.*, h.name as hypervisor_name
      FROM vm_templates t
      LEFT JOIN hypervisors h ON t.hypervisor_id = h.id
      ORDER BY t.name
    `).all();
  });

  // List templates from hypervisor (auto-discover)
  app.get('/api/templates/discover/:hypervisorId', async (request, reply) => {
    const { hypervisorId } = request.params as { hypervisorId: string };
    const db = getDb();
    const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(hypervisorId) as any;
    if (!hv) return reply.status(404).send({ error: 'Hypervisor not found' });

    const adapter = getAdapter(hv);
    const vms = await adapter.listVMs();
    return vms.filter(vm => vm.template);
  });

  // Save template
  app.post('/api/templates', async (request) => {
    const body = templateSchema.parse(request.body);
    const db = getDb();
    const result = db.prepare(
      'INSERT INTO vm_templates (hypervisor_id, source_vm_id, name, description, default_cores, default_memory_mb, default_disk_gb, os_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(body.hypervisor_id, body.source_vm_id, body.name, body.description || null, body.default_cores, body.default_memory_mb, body.default_disk_gb, body.os_type || null);
    return { id: result.lastInsertRowid };
  });

  // Delete template
  app.delete('/api/templates/:id', async (request) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    db.prepare('DELETE FROM vm_templates WHERE id = ?').run(id);
    return { message: 'Deleted' };
  });
}
