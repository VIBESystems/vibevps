import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/database.js';
import { authGuard } from '../auth/auth.guard.js';
import { getAdapter } from '../hypervisors/hypervisor.service.js';

const createVmSchema = z.object({
  hypervisor_id: z.number().int(),
  template_id: z.number().int().optional(),
  template_vm_id: z.string().optional(),
  name: z.string().min(1).max(63),
  hostname: z.string().min(1).max(63),
  network: z.object({
    mode: z.enum(['dhcp', 'static']).default('static'),
    ip: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).optional(),
    netmask: z.string().default('255.255.255.0'),
    gateway: z.string().optional(),
    dns: z.array(z.string()).default(['8.8.8.8', '1.1.1.1']),
  }),
  resources: z.object({
    cores: z.number().int().min(1).max(64).default(2),
    memory_mb: z.number().int().min(512).max(131072).default(2048),
    disk_gb: z.number().int().min(5).max(2048).optional(),
  }),
  post_install: z.object({
    auto_update: z.boolean().default(true),
    packages: z.array(z.string()).optional(),
    ssh_keys: z.array(z.string()).optional(),
  }).optional(),
});

function getHypervisor(id: number) {
  const db = getDb();
  const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(id) as any;
  if (!hv) throw new Error('Hypervisor not found');
  return hv;
}

function logAction(hypervisorId: number, vmId: string, vmName: string, action: string, details?: any, status = 'success') {
  const db = getDb();
  db.prepare('INSERT INTO vm_logs (hypervisor_id, vm_id, vm_name, action, details, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(hypervisorId, vmId, vmName, action, details ? JSON.stringify(details) : null, status);
}

export async function vmRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // List all VMs across all hypervisors
  app.get('/api/vms', async () => {
    const db = getDb();
    const hypervisors = db.prepare('SELECT * FROM hypervisors WHERE is_active = 1').all() as any[];
    const results = [];

    for (const hv of hypervisors) {
      try {
        const adapter = getAdapter(hv);
        const vms = await adapter.listVMs();
        results.push(...vms.map(vm => ({
          ...vm,
          hypervisorId: hv.id,
          hypervisorName: hv.name,
        })));
      } catch (e: any) {
        results.push({
          hypervisorId: hv.id,
          hypervisorName: hv.name,
          error: e.message,
        });
      }
    }
    return results;
  });

  // Get single VM
  app.get('/api/vms/:hypervisorId/:vmId', async (request, reply) => {
    const { hypervisorId, vmId } = request.params as { hypervisorId: string; vmId: string };
    const hv = getHypervisor(Number(hypervisorId));
    const adapter = getAdapter(hv);
    return adapter.getVM(vmId);
  });

  // VM actions
  for (const action of ['start', 'stop', 'restart', 'suspend'] as const) {
    app.post(`/api/vms/:hypervisorId/:vmId/${action}`, async (request) => {
      const { hypervisorId, vmId } = request.params as { hypervisorId: string; vmId: string };
      const hv = getHypervisor(Number(hypervisorId));
      const adapter = getAdapter(hv);
      const result = await adapter[`${action}VM`](vmId);
      logAction(Number(hypervisorId), vmId, '', action);
      return { taskId: result, action };
    });
  }

  // Delete VM
  app.delete('/api/vms/:hypervisorId/:vmId', async (request) => {
    const { hypervisorId, vmId } = request.params as { hypervisorId: string; vmId: string };
    const hv = getHypervisor(Number(hypervisorId));
    const adapter = getAdapter(hv);

    // Stop first if running
    try {
      const vm = await adapter.getVM(vmId);
      if (vm.status === 'running') {
        await adapter.stopVM(vmId);
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch { /* ignore */ }

    const result = await adapter.deleteVM(vmId);
    logAction(Number(hypervisorId), vmId, '', 'delete');
    return { taskId: result };
  });

  // Create VM from template
  app.post('/api/vms/create', async (request, reply) => {
    const body = createVmSchema.parse(request.body);
    const hv = getHypervisor(body.hypervisor_id);
    const adapter = getAdapter(hv);

    // Resolve template VM ID
    let templateVmId = body.template_vm_id;
    if (body.template_id && !templateVmId) {
      const db = getDb();
      const tmpl = db.prepare('SELECT source_vm_id FROM vm_templates WHERE id = ?').get(body.template_id) as any;
      if (!tmpl) return reply.status(404).send({ error: 'Template not found' });
      templateVmId = tmpl.source_vm_id;
    }
    if (!templateVmId) {
      return reply.status(400).send({ error: 'Specify template_id or template_vm_id' });
    }

    try {
      const newVmId = await adapter.cloneFromTemplate({
        templateVmId,
        name: body.name,
        hostname: body.hostname,
        network: {
          mode: body.network.mode,
          ip: body.network.ip,
          netmask: body.network.netmask,
          gateway: body.network.gateway,
          dns: body.network.dns,
        },
        resources: {
          cores: body.resources.cores,
          memoryMb: body.resources.memory_mb,
          diskGb: body.resources.disk_gb,
        },
        postInstall: body.post_install ? {
          autoUpdate: body.post_install.auto_update,
          packages: body.post_install.packages,
          sshKeys: body.post_install.ssh_keys,
        } : undefined,
      });

      logAction(body.hypervisor_id, newVmId, body.name, 'create', {
        template: templateVmId,
        network: body.network.mode === 'dhcp' ? 'DHCP' : body.network.ip,
        hostname: body.hostname,
      });

      return { vmId: newVmId, message: 'VM created successfully' };
    } catch (e: any) {
      logAction(body.hypervisor_id, '0', body.name, 'create', { error: e.message }, 'error');
      return reply.status(500).send({ error: e.message });
    }
  });

  // Activity logs
  app.get('/api/vms/logs', async (request) => {
    const { limit = '50' } = request.query as { limit?: string };
    const db = getDb();
    const logs = db.prepare(`
      SELECT l.*, h.name as hypervisor_name
      FROM vm_logs l
      LEFT JOIN hypervisors h ON l.hypervisor_id = h.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `).all(Number(limit));
    return logs;
  });
}
