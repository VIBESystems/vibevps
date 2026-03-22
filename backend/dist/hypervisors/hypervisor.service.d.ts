import { HypervisorAdapter } from './adapters/adapter.interface.js';
export declare function getAdapter(hypervisor: {
    id: number;
    type: string;
    host: string;
    port: number;
    node: string;
    api_token_id: string;
    api_token_secret: string;
    verify_ssl: number;
}): HypervisorAdapter;
export declare function clearAdapterCache(hypervisorId?: number): void;
//# sourceMappingURL=hypervisor.service.d.ts.map