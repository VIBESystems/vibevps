import { getDb } from '../db/database.js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const LICENSE_SERVER_URL = 'https://vibevault.vibesystems.dev';

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export interface LicenseInfo {
  serverId: string;
  licenseKey: string | null;
  customerName: string | null;
  customerEmail: string | null;
  planName: string | null;
  maxHypervisors: number;
  maxVms: number;
  expiresAt: string | null;
  isLifetime: boolean;
  activatedAt: string | null;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  changelog?: Array<{ version: string; date: string; changes: string[]; min_version_required?: string }>;
  downloadToken?: string;
  downloadTokens?: Record<string, string>;
  downloadUrl?: string;
}

export function getOrCreateServerId(): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_id') as any;
  if (row) return row.value;

  const serverId = randomUUID();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('server_id', serverId);
  return serverId;
}

export function getLicenseInfo(): LicenseInfo | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM license_info WHERE id = 1').get() as any;
  if (!row) return null;

  return {
    serverId: row.server_id,
    licenseKey: row.license_key,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    planName: row.plan_name,
    maxHypervisors: row.max_hypervisors || 0,
    maxVms: row.max_vms || 0,
    expiresAt: row.expires_at,
    isLifetime: !!row.is_lifetime,
    activatedAt: row.activated_at,
  };
}

export async function activateLicense(licenseKey: string, customerEmail: string): Promise<{ success: boolean; status: string; message: string }> {
  const serverId = getOrCreateServerId();

  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        server_id: serverId,
        customer_email: customerEmail,
        product: 'VIBEVps',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        status: data.status || 'error',
        message: data.message || 'Activation failed',
      };
    }

    // Save license info to DB
    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO license_info (id, server_id, license_key, customer_name, customer_email, plan_name, max_hypervisors, max_vms, expires_at, is_lifetime, activated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      serverId,
      licenseKey,
      data.customer_name || null,
      customerEmail,
      data.plan || null,
      data.max_hypervisors || 0,
      data.max_vms || 0,
      data.expires_at || null,
      data.is_lifetime ? 1 : 0,
    );

    // Now verify to get full details
    await verifyLicense();

    return { success: true, status: 'activated', message: 'License activated successfully' };
  } catch (error) {
    return { success: false, status: 'error', message: 'Could not connect to license server' };
  }
}

export async function verifyLicense(): Promise<{ valid: boolean; error?: string }> {
  const license = getLicenseInfo();
  if (!license?.licenseKey) return { valid: false, error: 'No license' };

  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: license.licenseKey,
        server_id: license.serverId,
        product: 'VIBEVps',
      }),
    });

    const data = await response.json();

    if (data.valid) {
      const db = getDb();
      db.prepare(`
        UPDATE license_info SET
          plan_name = ?, max_hypervisors = ?, max_vms = ?,
          expires_at = ?, is_lifetime = ?, customer_name = ?
        WHERE id = 1
      `).run(
        data.plan || null,
        data.max_hypervisors || 0,
        data.max_vms || 0,
        data.expires_at || null,
        data.is_lifetime ? 1 : 0,
        data.customer_name || null,
      );
    }

    return { valid: data.valid, error: data.message };
  } catch {
    return { valid: false, error: 'Could not connect to license server' };
  }
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const appVersion = getAppVersion();

  try {
    // VIBEVps uses the free endpoint — no license required
    const response = await fetch(`${LICENSE_SERVER_URL}/api/updates/check-free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: 'VIBEVps',
        current_version: appVersion,
      }),
    });

    if (!response.ok) {
      return { updateAvailable: false, currentVersion: appVersion };
    }

    const data = await response.json();

    // Normalize changelog
    let normalizedChangelog: any[] = [];
    if (Array.isArray(data.changelog)) {
      normalizedChangelog = data.changelog.map((entry: any) => ({
        version: entry.version,
        min_version_required: entry.min_version_required || entry.min_version || '1.0.0',
        date: entry.date,
        changes: entry.changes || [],
      }));
    } else if (data.changelog && typeof data.changelog === 'string') {
      try {
        const parsed = JSON.parse(data.changelog);
        if (Array.isArray(parsed)) {
          normalizedChangelog = parsed.map((entry: any) => ({
            version: entry.version,
            min_version_required: entry.min_version_required || entry.min_version || '1.0.0',
            date: entry.date,
            changes: entry.changes || [],
          }));
        }
      } catch { /* ignore */ }
    }

    return {
      updateAvailable: data.update_available || false,
      currentVersion: appVersion,
      latestVersion: data.latest_version,
      releaseDate: data.release_date,
      changelog: normalizedChangelog,
      downloadToken: data.download_token,
      downloadTokens: data.download_tokens || {},
      downloadUrl: data.download_token
        ? `${LICENSE_SERVER_URL}/api/updates/download/${data.download_token}`
        : undefined,
    };
  } catch {
    return { updateAvailable: false, currentVersion: appVersion };
  }
}

export function getServerInfo() {
  const serverId = getOrCreateServerId();
  const appVersion = getAppVersion();
  const license = getLicenseInfo();

  return {
    serverId,
    appVersion,
    license: license ? {
      licenseKey: license.licenseKey,
      planName: license.planName,
      customerName: license.customerName,
      maxHypervisors: license.maxHypervisors,
      maxVms: license.maxVms,
      expiresAt: license.expiresAt,
      isLifetime: license.isLifetime,
    } : null,
  };
}
