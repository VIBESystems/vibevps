import { FastifyInstance } from 'fastify';
import { writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkForUpdates, getServerInfo, activateLicense, verifyLicense } from './license.service.js';
import { calculateUpdatePath, filterAppliedUpdates, formatUpdatePath } from './update-sequencer.js';
import type { VersionHistory } from './update-sequencer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTALL_DIR = '/var/www/vibevps';
const LICENSE_SERVER_URL = 'https://vibevault.vibesystems.dev';

export async function updatesRoutes(app: FastifyInstance) {
  // Auth guard for all routes
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Non autorizzato' });
    }
  });

  // GET /api/updates - Check for available updates
  app.get('/api/updates', async () => {
    return await checkForUpdates();
  });

  // GET /api/license - Get license and server info
  app.get('/api/license', async () => {
    return getServerInfo();
  });

  // POST /api/license/activate - Activate or upgrade license
  app.post('/api/license/activate', async (request, reply) => {
    const { licenseKey, customerEmail } = request.body as { licenseKey: string; customerEmail: string };

    if (!licenseKey || !customerEmail) {
      return reply.status(400).send({ error: 'License key and email required' });
    }

    if (!licenseKey.startsWith('VV-')) {
      return reply.status(400).send({ error: 'Invalid license key format. Must start with VV-' });
    }

    return await activateLicense(licenseKey, customerEmail);
  });

  // POST /api/license/verify - Verify current license
  app.post('/api/license/verify', async () => {
    return await verifyLicense();
  });

  // POST /api/updates/install - Download and install update
  app.post('/api/updates/install', async (request, reply) => {
    const { downloadTokens, targetVersion, changelog } = request.body as {
      downloadTokens: Record<string, string>;
      targetVersion: string;
      changelog: any[];
    };

    if (!downloadTokens || !targetVersion || !changelog) {
      return reply.status(400).send({ error: 'Download tokens, target version, and changelog required' });
    }

    // Read current version
    let currentVersion: string;
    try {
      const pkg = JSON.parse(await readFile(join(INSTALL_DIR, 'package.json'), 'utf-8'));
      currentVersion = pkg.version;
    } catch {
      try {
        const pkg = JSON.parse(await readFile(join(__dirname, '../../../package.json'), 'utf-8'));
        currentVersion = pkg.version;
      } catch {
        return reply.status(500).send({ error: 'Cannot determine current version' });
      }
    }

    // Calculate update path
    const updatePath = calculateUpdatePath(currentVersion, targetVersion, changelog);
    if (!updatePath) {
      return reply.status(400).send({ error: 'No compatible update path found' });
    }
    if (updatePath.length === 0) {
      return { message: 'Already on target version', currentVersion };
    }

    // Read version history for idempotency
    let versionHistory: VersionHistory = { current_version: currentVersion, applied_updates: [] };
    try {
      const historyContent = await readFile(join(INSTALL_DIR, '.version-history.json'), 'utf-8');
      versionHistory = JSON.parse(historyContent);
    } catch { /* no history yet */ }

    const pendingUpdates = filterAppliedUpdates(updatePath, versionHistory);
    if (pendingUpdates.length === 0) {
      return { message: 'All updates already applied', currentVersion };
    }

    console.log(`[Update] Pending updates: ${pendingUpdates.length}`);
    console.log(formatUpdatePath(pendingUpdates));

    // Build chain with per-version download tokens
    const chain = pendingUpdates.map(u => ({
      version: u.version,
      downloadUrl: downloadTokens[u.version]
        ? `${LICENSE_SERVER_URL}/api/updates/download/${downloadTokens[u.version]}`
        : null,
    }));

    // Download first update zip
    const firstStep = chain[0];
    if (!firstStep.downloadUrl) {
      return reply.status(500).send({ error: `No download token for version ${firstStep.version}` });
    }

    const downloadResponse = await fetch(firstStep.downloadUrl);
    if (!downloadResponse.ok) {
      return reply.status(500).send({ error: 'Download failed' });
    }

    const buffer = await downloadResponse.arrayBuffer();
    const updateFilePath = '/tmp/vibevps-update.zip';
    await writeFile(updateFilePath, Buffer.from(buffer));

    // Save chain for sequential updates (if multi-step)
    if (chain.length > 1) {
      const updateChain = {
        chain: chain.slice(1), // remaining steps after the first
        currentStep: 0,
      };
      await writeFile('/tmp/update-chain.json', JSON.stringify(updateChain, null, 2));
    }

    // Launch update script in background
    const scriptPath = join(INSTALL_DIR, 'scripts', 'update.sh');
    const command = `setsid nohup bash ${scriptPath} ${updateFilePath} >> /var/log/vibevps-update.log 2>&1 &`;

    exec(command, { cwd: INSTALL_DIR }, (error) => {
      if (error) console.error('[Update] Failed to launch script:', error);
    });

    return {
      success: true,
      message: pendingUpdates.length === 1
        ? 'Update started. Application will restart automatically.'
        : `Sequential update started (${pendingUpdates.length} steps). Application will restart after all updates complete.`,
      updatePath: pendingUpdates.map(u => u.version),
    };
  });
}
