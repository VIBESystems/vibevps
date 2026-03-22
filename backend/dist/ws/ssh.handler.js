import { Client } from 'ssh2';
import { getDb } from '../db/database.js';
import { getAdapter } from '../hypervisors/hypervisor.service.js';
import { WebSocket } from 'ws';
export async function sshHandler(app) {
    app.get('/ws/ssh', { websocket: true }, (socket, request) => {
        const query = request.query;
        const hypervisorId = Number(query.hypervisorId);
        const vmId = query.vmId;
        if (!hypervisorId || !vmId) {
            socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Parametri mancanti' }));
            socket.close();
            return;
        }
        let sshClient = null;
        let sshStream = null;
        let authenticated = false;
        socket.on('message', async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'auth' && !authenticated) {
                    authenticated = true;
                    await connectSSH(socket, hypervisorId, vmId, msg.username, msg.password, (client, stream) => {
                        sshClient = client;
                        sshStream = stream;
                    });
                }
                else if (msg.type === 'data' && sshStream) {
                    sshStream.write(msg.data);
                }
                else if (msg.type === 'resize' && sshStream) {
                    sshStream.setWindow(msg.rows, msg.cols, 0, 0);
                }
            }
            catch {
                // ignore malformed messages
            }
        });
        socket.on('close', () => {
            if (sshStream) {
                sshStream.close();
                sshStream = null;
            }
            if (sshClient) {
                sshClient.end();
                sshClient = null;
            }
        });
    });
}
async function connectSSH(socket, hypervisorId, vmId, username, password, onReady) {
    const db = getDb();
    const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(hypervisorId);
    if (!hv) {
        socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Hypervisor non trovato' }));
        socket.close();
        return;
    }
    let vmIp;
    try {
        const adapter = getAdapter(hv);
        // 1. Try guest agent IP lookup
        if (typeof adapter.getVMIp === 'function') {
            try {
                vmIp = await adapter.getVMIp(vmId);
            }
            catch { /* guest agent not available, continue */ }
        }
        // 2. Fallback: get VM detail and check ip field + cloud-init config
        if (!vmIp) {
            try {
                const vm = await adapter.getVM(vmId);
                vmIp = vm.ip;
                // 3. Fallback: extract IP from cloud-init config (ipconfig0)
                if (!vmIp && vm.config) {
                    const ipconfig = vm.config.ipconfig0 || '';
                    const match = ipconfig.match(/ip=(\d+\.\d+\.\d+\.\d+)/);
                    if (match)
                        vmIp = match[1];
                }
            }
            catch { /* adapter error, continue */ }
        }
    }
    catch {
        // getAdapter failed
    }
    if (!vmIp) {
        socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'IP della VM non disponibile. Assicurati che il QEMU Guest Agent sia attivo.' }));
        socket.close();
        return;
    }
    const conn = new Client();
    conn.on('ready', () => {
        socket.send(JSON.stringify({ type: 'status', status: 'connected' }));
        conn.shell({ term: 'xterm-256color' }, (err, stream) => {
            if (err) {
                socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Impossibile aprire la shell' }));
                socket.close();
                return;
            }
            onReady(conn, stream);
            stream.on('data', (data) => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
                }
            });
            stream.on('close', () => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
                    socket.close();
                }
            });
        });
    });
    conn.on('error', (err) => {
        const message = err.message.includes('Authentication')
            ? 'Autenticazione fallita. Verifica username e password.'
            : `Errore connessione SSH: ${err.message}`;
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'status', status: 'error', message }));
            socket.close();
        }
    });
    conn.on('close', () => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
            socket.close();
        }
    });
    conn.connect({
        host: vmIp,
        port: 22,
        username,
        password,
        readyTimeout: 10000,
    });
}
//# sourceMappingURL=ssh.handler.js.map