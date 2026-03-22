import { ProxmoxAdapter } from './adapters/proxmox.adapter.js';
const adapters = new Map();
export function getAdapter(hypervisor) {
    const cached = adapters.get(hypervisor.id);
    if (cached)
        return cached;
    let adapter;
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
            throw new Error(`Tipo hypervisor non supportato: ${hypervisor.type}`);
    }
    adapters.set(hypervisor.id, adapter);
    return adapter;
}
export function clearAdapterCache(hypervisorId) {
    if (hypervisorId) {
        adapters.delete(hypervisorId);
    }
    else {
        adapters.clear();
    }
}
//# sourceMappingURL=hypervisor.service.js.map