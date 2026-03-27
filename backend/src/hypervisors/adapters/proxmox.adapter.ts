import { HypervisorAdapter, NodeStatus, VM, VMDetail, CreateVMConfig, StorageInfo } from './adapter.interface.js';
import { Agent, request as undiciRequest, FormData } from 'undici';

interface ProxmoxConfig {
  host: string;
  port: number;
  node: string;
  tokenId: string;
  tokenSecret: string;
  verifySsl: boolean;
}

export class ProxmoxAdapter implements HypervisorAdapter {
  private baseUrl: string;
  private headers: Record<string, string>;
  private node: string;
  private agent: Agent;

  constructor(private cfg: ProxmoxConfig) {
    this.baseUrl = `https://${cfg.host}:${cfg.port}/api2/json`;
    this.node = cfg.node;
    this.headers = {
      'Authorization': `PVEAPIToken=${cfg.tokenId}=${cfg.tokenSecret}`,
    };
    this.agent = new Agent({
      connect: { rejectUnauthorized: cfg.verifySsl },
    });
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;

    let bodyStr: string | undefined;
    const headers: Record<string, string> = { ...this.headers };

    if (body && method !== 'GET') {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      bodyStr = params.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const { statusCode, body: resBody } = await undiciRequest(url, {
      method: method as any,
      headers,
      body: bodyStr,
      dispatcher: this.agent,
    });

    const text = await resBody.text();

    if (statusCode >= 400) {
      throw new Error(`Proxmox API error ${statusCode}: ${text}`);
    }

    const json = JSON.parse(text);
    return json.data;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', `/nodes/${this.node}/status`);
      return true;
    } catch {
      return false;
    }
  }

  async getNodeStatus(): Promise<NodeStatus> {
    const data = await this.request('GET', `/nodes/${this.node}/status`);
    return {
      hostname: data.hostname || this.node,
      uptime: data.uptime || 0,
      cpu: data.cpu || 0,
      cpuCount: data.cpuinfo?.cpus || 0,
      memoryUsed: data.memory?.used || 0,
      memoryTotal: data.memory?.total || 0,
      diskUsed: data.rootfs?.used || 0,
      diskTotal: data.rootfs?.total || 0,
      version: data.pveversion,
    };
  }

  async listStorages(): Promise<StorageInfo[]> {
    const data = await this.request('GET', `/nodes/${this.node}/storage`);
    return (data || []).map((s: any) => ({
      id: s.storage,
      type: s.type || 'unknown',
      content: s.content || '',
      total: s.total || 0,
      used: s.used || 0,
      available: s.avail || 0,
      active: s.active === 1,
      shared: s.shared === 1,
      usagePercent: s.total > 0 ? (s.used || 0) / s.total : 0,
    }));
  }

  async listVMs(): Promise<VM[]> {
    const data = await this.request('GET', `/nodes/${this.node}/qemu`);
    return (data || []).map((vm: any) => this.mapVM(vm));
  }

  async getVM(vmId: string): Promise<VMDetail> {
    const [status, config] = await Promise.all([
      this.request('GET', `/nodes/${this.node}/qemu/${vmId}/status/current`),
      this.request('GET', `/nodes/${this.node}/qemu/${vmId}/config`),
    ]);
    const vm = this.mapVM(status);

    // Try to get IP from guest agent if VM is running
    if (vm.status === 'running') {
      try {
        vm.ip = await this.getVMIp(vmId);
      } catch { /* guest agent not available */ }
    }

    return { ...vm, config };
  }

  async getVMIp(vmId: string): Promise<string | undefined> {
    const interfaces = await this.request(
      'GET',
      `/nodes/${this.node}/qemu/${vmId}/agent/network-get-interfaces`,
    );
    if (!Array.isArray(interfaces?.result)) return undefined;
    for (const iface of interfaces.result) {
      if (iface.name === 'lo') continue;
      const addrs = iface['ip-addresses'] || [];
      for (const addr of addrs) {
        if (addr['ip-address-type'] === 'ipv4' && addr['ip-address'] !== '127.0.0.1') {
          return addr['ip-address'];
        }
      }
    }
    return undefined;
  }

  async startVM(vmId: string): Promise<string> {
    return this.request('POST', `/nodes/${this.node}/qemu/${vmId}/status/start`);
  }

  async stopVM(vmId: string): Promise<string> {
    return this.request('POST', `/nodes/${this.node}/qemu/${vmId}/status/stop`);
  }

  async restartVM(vmId: string): Promise<string> {
    return this.request('POST', `/nodes/${this.node}/qemu/${vmId}/status/reboot`);
  }

  async suspendVM(vmId: string): Promise<string> {
    return this.request('POST', `/nodes/${this.node}/qemu/${vmId}/status/suspend`);
  }

  async deleteVM(vmId: string): Promise<string> {
    return this.request('DELETE', `/nodes/${this.node}/qemu/${vmId}`);
  }

  async getNextVmId(): Promise<number> {
    const data = await this.request('GET', '/cluster/nextid');
    return Number(data);
  }

  async findSnippetStorage(): Promise<string | null> {
    const storages = await this.request('GET', `/nodes/${this.node}/storage`);
    for (const s of storages) {
      const contentTypes = (s.content || '').split(',');
      if (contentTypes.includes('snippets') && s.active !== 0) {
        return s.storage;
      }
    }
    return null;
  }

  async uploadVendorData(vmId: number, snippetStorage: string): Promise<string> {
    const filename = `vibevps-${vmId}-vendor.yml`;
    const yamlContent = [
      '#cloud-config',
      'packages:',
      '  - qemu-guest-agent',
      'runcmd:',
      '  - systemctl enable qemu-guest-agent',
      '  - systemctl start qemu-guest-agent',
    ].join('\n') + '\n';

    const url = `${this.baseUrl}/nodes/${this.node}/storage/${snippetStorage}/upload`;
    const form = new FormData();
    form.append('content', 'snippets');
    form.append('filename', filename);
    form.append('file', new Blob([yamlContent]), filename);

    const { statusCode, body: resBody } = await undiciRequest(url, {
      method: 'POST',
      headers: { 'Authorization': this.headers['Authorization'] },
      body: form,
      dispatcher: this.agent,
    });

    const text = await resBody.text();
    if (statusCode >= 400) {
      throw new Error(`Upload snippet failed ${statusCode}: ${text}`);
    }

    return `${snippetStorage}:snippets/${filename}`;
  }

  async cloneFromTemplate(cfg: CreateVMConfig): Promise<string> {
    const newId = await this.getNextVmId();

    // 1. Clone the template - returns UPID (task ID)
    const upid = await this.request('POST', `/nodes/${this.node}/qemu/${cfg.templateVmId}/clone`, {
      newid: newId,
      name: cfg.name,
      full: 1,
    });

    // 2. Wait for clone task to FINISH
    await this.waitForTaskComplete(upid);

    // 3. Detect storage from existing disk and check if cloud-init drive exists
    const currentConfig = await this.request('GET', `/nodes/${this.node}/qemu/${newId}/config`);
    const hasCloudInit = Object.entries(currentConfig).some(
      ([_, v]) => String(v).includes('cloudinit')
    );

    // Find main disk and storage name (scsi0, virtio0, etc.)
    let storage = 'local-lvm';
    let mainDisk = '';
    for (const [key, val] of Object.entries(currentConfig)) {
      if (/^(scsi|virtio)\d+$/.test(key) && !String(val).includes('cloudinit') && !String(val).includes('cdrom')) {
        if (!mainDisk) mainDisk = key;
        storage = String(val).split(':')[0];
        break;
      }
    }

    // 4. Add cloud-init drive if not present
    if (!hasCloudInit) {
      let ciSlot = 'ide0';
      for (const slot of ['ide0', 'ide1', 'ide3']) {
        if (!currentConfig[slot]) {
          ciSlot = slot;
          break;
        }
      }
      await this.request('PUT', `/nodes/${this.node}/qemu/${newId}/config`, {
        [ciSlot]: `${storage}:cloudinit`,
      });
    }

    // 5. Resize disk if requested (only grow, Proxmox can't shrink)
    if (cfg.resources.diskGb && mainDisk) {
      const sizeMatch = String(currentConfig[mainDisk]).match(/size=(\d+)G/);
      const currentSizeGb = sizeMatch ? Number(sizeMatch[1]) : 0;

      if (cfg.resources.diskGb > currentSizeGb) {
        await this.request('PUT', `/nodes/${this.node}/qemu/${newId}/resize`, {
          disk: mainDisk,
          size: `${cfg.resources.diskGb}G`,
        });
      }
    }

    // 6. Generate unique MAC address and rebuild net0 to avoid DHCP conflicts
    const net0Current = String(currentConfig.net0 || '');
    const newMac = this.generateMacAddress();
    console.log(`[VM Clone] net0 from template: "${net0Current}"`);
    console.log(`[VM Clone] new MAC generated: ${newMac}`);
    // Preserve bridge and model from template, replace MAC
    const net0New = net0Current
      ? net0Current.replace(/[0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5}/, newMac)
      : `virtio=${newMac},bridge=vmbr0`;
    console.log(`[VM Clone] net0 new value: "${net0New}"`);

    // 7. Set hostname, IP, resources, enable guest agent via cloud-init
    const ipconfig0 = cfg.network.mode === 'dhcp'
      ? 'ip=dhcp'
      : `ip=${cfg.network.ip}/${this.netmaskToCidr(cfg.network.netmask!)},gw=${cfg.network.gateway}`;

    const vmConfig: Record<string, any> = {
      cores: cfg.resources.cores,
      memory: cfg.resources.memoryMb,
      agent: '1,fstrim_cloned_disks=1',
      net0: net0New,
      ciuser: 'root',
      ciupgrade: cfg.postInstall?.autoUpdate ? 1 : 0,
      ipconfig0,
      nameserver: cfg.network.dns.length > 0 ? cfg.network.dns.join(' ') : undefined,
      searchdomain: 'local',
      name: cfg.hostname,
    };

    if (cfg.postInstall?.sshKeys?.length) {
      vmConfig.sshkeys = encodeURIComponent(cfg.postInstall.sshKeys.join('\n'));
    }

    // 8. Upload cloud-init vendor-data to auto-install qemu-guest-agent
    try {
      const snippetStorage = await this.findSnippetStorage();
      if (snippetStorage) {
        const vendorRef = await this.uploadVendorData(newId, snippetStorage);
        vmConfig.cicustom = `vendor=${vendorRef}`;
        console.log(`[VM Clone] Cloud-init vendor-data uploaded: ${vendorRef}`);
      }
    } catch (err) {
      console.log(`[VM Clone] Snippet upload skipped: ${err instanceof Error ? err.message : err}`);
    }

    await this.request('PUT', `/nodes/${this.node}/qemu/${newId}/config`, vmConfig);

    // Force cloud-init drive regeneration so the new ipconfig0 is baked in
    // (prevents VM from booting with stale IP inherited from the template)
    try {
      await this.request('PUT', `/nodes/${this.node}/qemu/${newId}/cloudinit`);
    } catch { /* not critical, Proxmox regenerates automatically on most versions */ }

    // 7. Start the VM
    await this.request('POST', `/nodes/${this.node}/qemu/${newId}/status/start`);

    // 8. After boot, regenerate machine-id (fixes DHCP DUID conflicts on clones)
    //    and expand partition + filesystem via guest agent
    const diskDev = mainDisk ? (mainDisk.startsWith('scsi') ? '/dev/sda' : '/dev/vda') : '';
    this.postBootSetup(newId, diskDev, !!cfg.resources.diskGb).catch(() => {
      // Non-blocking
    });

    return String(newId);
  }

  private async postBootSetup(vmId: number, diskDev: string, expandDisk: boolean): Promise<void> {
    // Wait for guest agent to be ready (max 120 seconds)
    let agentReady = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        await this.request('GET', `/nodes/${this.node}/qemu/${vmId}/agent/info`);
        agentReady = true;
        break;
      } catch { /* retry */ }
    }
    if (!agentReady) return;

    // Let the OS fully boot
    await new Promise(r => setTimeout(r, 5000));

    // 1. Regenerate machine-id so DHCP client gets a unique DUID
    //    (cloned VMs share the same machine-id -> same DUID -> same DHCP lease)
    const machineIdScript = [
      `export PATH=/usr/sbin:/usr/bin:/sbin:/bin:$PATH`,
      // Truncate machine-id and regenerate
      `rm -f /etc/machine-id /var/lib/dbus/machine-id`,
      `systemd-machine-id-setup`,
      `ln -sf /etc/machine-id /var/lib/dbus/machine-id 2>/dev/null || true`,
      // Remove old DHCP leases so it requests a fresh one
      `rm -f /var/lib/dhcp/dhclient.* 2>/dev/null || true`,
      `rm -f /var/lib/NetworkManager/dhclient-*.lease 2>/dev/null || true`,
      `rm -rf /var/lib/systemd/network/* 2>/dev/null || true`,
      // Restart networking to pick up new DUID
      `systemctl restart systemd-networkd 2>/dev/null || true`,
      `systemctl restart networking 2>/dev/null || true`,
      `dhclient -r 2>/dev/null; dhclient 2>/dev/null || true`,
    ].join('\n');

    console.log(`[VM ${vmId}] Regenerating machine-id and renewing DHCP lease...`);
    try {
      await this.request('POST', `/nodes/${this.node}/qemu/${vmId}/agent/exec`, {
        command: '/bin/bash',
        'input-data': machineIdScript + '\n',
      });
    } catch { /* non-blocking */ }

    // 2. Expand disk if needed
    if (expandDisk && diskDev) {
      await new Promise(r => setTimeout(r, 3000));

      const diskScript = [
        `export PATH=/usr/sbin:/usr/bin:/sbin:/bin:$PATH`,
        `apt-get install -y cloud-guest-utils 2>/dev/null || true`,
        `growpart ${diskDev} 2 2>/dev/null || true`,
        `growpart ${diskDev} 3 2>/dev/null || true`,
        `resize2fs ${diskDev}2 2>/dev/null || true`,
        `resize2fs ${diskDev}3 2>/dev/null || true`,
        `xfs_growfs / 2>/dev/null || true`,
        `pvresize ${diskDev}2 2>/dev/null || pvresize ${diskDev}3 2>/dev/null || true`,
        `LV=$(lvdisplay -c 2>/dev/null | head -1 | cut -d: -f1 | tr -d ' ')`,
        `if [ -n "$LV" ]; then lvextend -l +100%FREE "$LV" 2>/dev/null; resize2fs "$LV" 2>/dev/null || xfs_growfs "$LV" 2>/dev/null; fi`,
      ].join('\n');

      console.log(`[VM ${vmId}] Expanding filesystem...`);
      try {
        await this.request('POST', `/nodes/${this.node}/qemu/${vmId}/agent/exec`, {
          command: '/bin/bash',
          'input-data': diskScript + '\n',
        });
      } catch { /* non-blocking */ }
    }
  }

  private async waitForTaskComplete(upid: string, maxWait = 300000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      const taskStatus = await this.request('GET', `/nodes/${this.node}/tasks/${encodeURIComponent(upid)}/status`);
      if (taskStatus.status === 'stopped') {
        if (taskStatus.exitstatus === 'OK') {
          return;
        }
        throw new Error(`Task failed: ${taskStatus.exitstatus}`);
      }
      // Task still running, wait and retry
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('Timeout: clone is taking too long');
  }

  private mapVM(data: any): VM {
    return {
      vmid: String(data.vmid),
      name: data.name || `VM ${data.vmid}`,
      status: this.mapStatus(data.status),
      cpu: data.cpu || 0,
      cpuCount: data.cpus || data.maxcpu || 0,
      memoryUsed: data.mem || 0,
      memoryTotal: data.maxmem || 0,
      diskUsed: data.disk || 0,
      diskTotal: data.maxdisk || 0,
      uptime: data.uptime || 0,
      netin: data.netin || 0,
      netout: data.netout || 0,
      template: data.template === 1,
      tags: data.tags,
    };
  }

  private mapStatus(status: string): VM['status'] {
    switch (status) {
      case 'running': return 'running';
      case 'stopped': return 'stopped';
      case 'paused': return 'paused';
      case 'suspended': return 'suspended';
      default: return 'unknown';
    }
  }

  private generateMacAddress(): string {
    // Generate random MAC with locally-administered unicast prefix
    const bytes = Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
    bytes[0] = (bytes[0] & 0xfe) | 0x02; // Set locally-administered, clear multicast
    return bytes.map(b => b.toString(16).padStart(2, '0')).join(':');
  }

  private netmaskToCidr(netmask: string): number {
    return netmask.split('.').reduce((acc, octet) => {
      return acc + (Number(octet) >>> 0).toString(2).split('1').length - 1;
    }, 0);
  }
}
