import { HypervisorAdapter, NodeStatus, VM, VMDetail, CreateVMConfig, StorageInfo } from './adapter.interface.js';
interface ProxmoxConfig {
    host: string;
    port: number;
    node: string;
    tokenId: string;
    tokenSecret: string;
    verifySsl: boolean;
}
export declare class ProxmoxAdapter implements HypervisorAdapter {
    private cfg;
    private baseUrl;
    private headers;
    private node;
    private agent;
    constructor(cfg: ProxmoxConfig);
    private request;
    testConnection(): Promise<boolean>;
    getNodeStatus(): Promise<NodeStatus>;
    listStorages(): Promise<StorageInfo[]>;
    listVMs(): Promise<VM[]>;
    getVM(vmId: string): Promise<VMDetail>;
    getVMIp(vmId: string): Promise<string | undefined>;
    startVM(vmId: string): Promise<string>;
    stopVM(vmId: string): Promise<string>;
    restartVM(vmId: string): Promise<string>;
    suspendVM(vmId: string): Promise<string>;
    deleteVM(vmId: string): Promise<string>;
    getNextVmId(): Promise<number>;
    findSnippetStorage(): Promise<string | null>;
    uploadVendorData(vmId: number, snippetStorage: string): Promise<string>;
    cloneFromTemplate(cfg: CreateVMConfig): Promise<string>;
    private postBootSetup;
    private waitForTaskComplete;
    private mapVM;
    private mapStatus;
    private generateMacAddress;
    private netmaskToCidr;
}
export {};
//# sourceMappingURL=proxmox.adapter.d.ts.map