import { getDb } from '../db/database.js';
import { getAdapter } from '../hypervisors/hypervisor.service.js';
import { WebSocket } from 'ws';
const clients = new Set();
let pollInterval = null;
export async function wsHub(app) {
    app.get('/ws', { websocket: true }, (socket) => {
        clients.add(socket);
        socket.on('close', () => clients.delete(socket));
    });
    startPolling();
}
function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}
function startPolling() {
    if (pollInterval)
        return;
    pollInterval = setInterval(async () => {
        if (clients.size === 0)
            return;
        const db = getDb();
        const hypervisors = db.prepare('SELECT * FROM hypervisors WHERE is_active = 1').all();
        for (const hv of hypervisors) {
            try {
                const adapter = getAdapter(hv);
                const [nodeStatus, vms, storages] = await Promise.all([
                    adapter.getNodeStatus(),
                    adapter.listVMs(),
                    adapter.listStorages(),
                ]);
                broadcast({
                    type: 'update',
                    hypervisorId: hv.id,
                    nodeStatus,
                    storages,
                    vms: vms.map(vm => ({
                        ...vm,
                        hypervisorId: hv.id,
                        hypervisorName: hv.name,
                    })),
                });
            }
            catch {
                // Skip unreachable hypervisors
            }
        }
    }, 5000);
}
//# sourceMappingURL=ws.hub.js.map