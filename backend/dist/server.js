import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { authRoutes } from './auth/auth.routes.js';
import { hypervisorRoutes } from './hypervisors/hypervisor.routes.js';
import { vmRoutes } from './vms/vm.routes.js';
import { templateRoutes } from './templates/template.routes.js';
import { settingsRoutes } from './settings/settings.routes.js';
import { updatesRoutes } from './updates/updates.routes.js';
import { wsHub } from './ws/ws.hub.js';
import { sshHandler } from './ws/ssh.handler.js';
import { getDb } from './db/database.js';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: true });
// Plugins
await app.register(cors, { origin: config.corsOrigin });
await app.register(jwt, { secret: config.jwtSecret });
await app.register(websocket);
// Initialize DB
getDb();
// Routes
await app.register(authRoutes);
await app.register(hypervisorRoutes);
await app.register(vmRoutes);
await app.register(templateRoutes);
await app.register(settingsRoutes);
await app.register(updatesRoutes);
await app.register(wsHub);
await app.register(sshHandler);
// Serve frontend in production
const frontendPath = join(__dirname, '../../frontend/dist');
if (existsSync(frontendPath)) {
    await app.register(fastifyStatic, {
        root: frontendPath,
        prefix: '/',
    });
    // SPA fallback
    app.setNotFoundHandler((_, reply) => {
        return reply.sendFile('index.html');
    });
}
// Start
try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`VIBEVps backend running on http://${config.host}:${config.port}`);
}
catch (err) {
    app.log.error(err);
    process.exit(1);
}
//# sourceMappingURL=server.js.map