import { FastifyInstance } from 'fastify';
import { Client, ClientChannel } from 'ssh2';
import { getDb } from '../db/database.js';
import { getAdapter } from '../hypervisors/hypervisor.service.js';
import { WebSocket } from 'ws';

export async function sshHandler(app: FastifyInstance) {
  app.get('/ws/ssh', { websocket: true }, (socket, request) => {
    const query = request.query as { hypervisorId?: string; vmId?: string };
    const hypervisorId = Number(query.hypervisorId);
    const vmId = query.vmId;

    if (!hypervisorId || !vmId) {
      socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Missing parameters' }));
      socket.close();
      return;
    }

    let sshClient: Client | null = null;
    let sshStream: ClientChannel | null = null;
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
        } else if (msg.type === 'data' && sshStream) {
          sshStream.write(msg.data);
        } else if (msg.type === 'resize' && sshStream) {
          sshStream.setWindow(msg.rows, msg.cols, 0, 0);
        }
      } catch {
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

async function connectSSH(
  socket: WebSocket,
  hypervisorId: number,
  vmId: string,
  username: string,
  password: string,
  onReady: (client: Client, stream: ClientChannel) => void,
) {
  const db = getDb();
  const hv = db.prepare('SELECT * FROM hypervisors WHERE id = ?').get(hypervisorId) as any;
  if (!hv) {
    socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Hypervisor not found' }));
    socket.close();
    return;
  }

  let vmIp: string | undefined;
  try {
    const adapter = getAdapter(hv) as any;

    // 1. Try guest agent IP lookup
    if (typeof adapter.getVMIp === 'function') {
      try {
        vmIp = await adapter.getVMIp(vmId);
      } catch { /* guest agent not available, continue */ }
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
          if (match) vmIp = match[1];
        }
      } catch { /* adapter error, continue */ }
    }
  } catch {
    // getAdapter failed
  }

  if (!vmIp) {
    socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'VM IP not available. Make sure the QEMU Guest Agent is active.' }));
    socket.close();
    return;
  }

  const conn = new Client();

  conn.on('ready', () => {
    socket.send(JSON.stringify({ type: 'status', status: 'connected' }));

    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
      if (err) {
        socket.send(JSON.stringify({ type: 'status', status: 'error', message: 'Unable to open shell' }));
        socket.close();
        return;
      }

      onReady(conn, stream);

      stream.on('data', (data: Buffer) => {
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
      ? 'Authentication failed. Check username and password.'
      : `SSH connection error: ${err.message}`;
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
