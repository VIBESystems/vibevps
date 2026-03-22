export interface NodeStatus {
    hostname: string;
    uptime: number;
    cpu: number;
    cpuCount: number;
    memoryUsed: number;
    memoryTotal: number;
    diskUsed: number;
    diskTotal: number;
    version?: string;
}
export interface VM {
    vmid: string;
    name: string;
    status: 'running' | 'stopped' | 'paused' | 'suspended' | 'unknown';
    cpu: number;
    cpuCount: number;
    memoryUsed: number;
    memoryTotal: number;
    diskUsed: number;
    diskTotal: number;
    uptime: number;
    netin: number;
    netout: number;
    ip?: string;
    template?: boolean;
    tags?: string;
}
export interface VMDetail extends VM {
    config: Record<string, any>;
}
export interface CreateVMConfig {
    templateVmId: string;
    name: string;
    hostname: string;
    network: {
        mode: 'dhcp' | 'static';
        ip?: string;
        netmask?: string;
        gateway?: string;
        dns: string[];
    };
    resources: {
        cores: number;
        memoryMb: number;
        diskGb?: number;
    };
    postInstall?: {
        autoUpdate: boolean;
        packages?: string[];
        sshKeys?: string[];
    };
}
export interface StorageInfo {
    id: string;
    type: string;
    content: string;
    total: number;
    used: number;
    available: number;
    active: boolean;
    shared: boolean;
    usagePercent: number;
}
export interface HypervisorAdapter {
    listStorages(): Promise<StorageInfo[]>;
    testConnection(): Promise<boolean>;
    getNodeStatus(): Promise<NodeStatus>;
    listVMs(): Promise<VM[]>;
    getVM(vmId: string): Promise<VMDetail>;
    startVM(vmId: string): Promise<string>;
    stopVM(vmId: string): Promise<string>;
    restartVM(vmId: string): Promise<string>;
    suspendVM(vmId: string): Promise<string>;
    deleteVM(vmId: string): Promise<string>;
    cloneFromTemplate(config: CreateVMConfig): Promise<string>;
    getNextVmId(): Promise<number>;
}
//# sourceMappingURL=adapter.interface.d.ts.map