import { HypervisorAdapter } from './adapters/adapter.interface.js';
import { ProxmoxAdapter } from './adapters/proxmox.adapter.js';

const adapters = new Map<number, HypervisorAdapter>();

export function getAdapter(hypervisor: {
  id: number;
  type: string;
  host: string;
  port: number;
  node: string;
  api_token_id: string;
  api_token_secret: string;
  verify_ssl: number;
}): HypervisorAdapter {
  const cached = adapters.get(hypervisor.id);
  if (cached) return cached;

  let adapter: HypervisorAdapter;

  switch (hypervisor.type) {
    case 'proxmox':
      adapter = new ProxmoxAdapter({
        host: hypervisor.host,
        port: hypervisor.port,
        node: hypervisor.node || 'pve',
        tokenId: hypervisor.api_token_id,
        tokenSecret: hypervisor.api_token_secret,
        verifySsl: hypervisor.verify_ssl === 1,
      });
      break;
    default:
      throw new Error(`Unsupported hypervisor type: ${hypervisor.type}`);
  }

  adapters.set(hypervisor.id, adapter);
  return adapter;
}

export function clearAdapterCache(hypervisorId?: number) {
  if (hypervisorId) {
    adapters.delete(hypervisorId);
  } else {
    adapters.clear();
  }
}
