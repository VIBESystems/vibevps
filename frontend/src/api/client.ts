const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('vvps_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('vvps_token', token);
    } else {
      localStorage.removeItem('vvps_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const headers: Record<string, string> = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'API Error');
    }
    return data;
  }

  // Auth
  login(username: string, password: string) {
    return this.request<{ token: string; user: any }>('POST', '/auth/login', { username, password });
  }

  me() {
    return this.request<any>('GET', '/auth/me');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request('POST', '/auth/change-password', { currentPassword, newPassword });
  }

  // Hypervisors
  getHypervisors() {
    return this.request<any[]>('GET', '/hypervisors');
  }

  addHypervisor(data: any) {
    return this.request<{ id: number }>('POST', '/hypervisors', data);
  }

  updateHypervisor(id: number, data: any) {
    return this.request('PUT', `/hypervisors/${id}`, data);
  }

  deleteHypervisor(id: number) {
    return this.request('DELETE', `/hypervisors/${id}`);
  }

  testHypervisor(id: number) {
    return this.request<{ connected: boolean; error?: string }>('GET', `/hypervisors/${id}/test`);
  }

  getHypervisorStatus(id: number) {
    return this.request<any>('GET', `/hypervisors/${id}/status`);
  }

  // VMs
  getVMs() {
    return this.request<any[]>('GET', '/vms');
  }

  getVM(hypervisorId: number, vmId: string) {
    return this.request<any>('GET', `/vms/${hypervisorId}/${vmId}`);
  }

  vmAction(hypervisorId: number, vmId: string, action: string) {
    return this.request('POST', `/vms/${hypervisorId}/${vmId}/${action}`);
  }

  deleteVM(hypervisorId: number, vmId: string) {
    return this.request('DELETE', `/vms/${hypervisorId}/${vmId}`);
  }

  createVM(data: any) {
    return this.request<{ vmId: string }>('POST', '/vms/create', data);
  }

  getLogs(limit = 50) {
    return this.request<any[]>('GET', `/vms/logs?limit=${limit}`);
  }

  // Templates
  getTemplates() {
    return this.request<any[]>('GET', '/templates');
  }

  discoverTemplates(hypervisorId: number) {
    return this.request<any[]>('GET', `/templates/discover/${hypervisorId}`);
  }

  addTemplate(data: any) {
    return this.request<{ id: number }>('POST', '/templates', data);
  }

  deleteTemplate(id: number) {
    return this.request('DELETE', `/templates/${id}`);
  }

  // Storages
  getHypervisorStorages(hypervisorId: number) {
    return this.request<any[]>('GET', `/hypervisors/${hypervisorId}/storages`);
  }

  // Updates & License
  checkForUpdates() {
    return this.request<any>('GET', '/updates');
  }

  getLicenseInfo() {
    return this.request<any>('GET', '/license');
  }

  activateLicense(licenseKey: string, customerEmail: string) {
    return this.request<any>('POST', '/license/activate', { licenseKey, customerEmail });
  }

  installUpdate(downloadTokens: Record<string, string>, targetVersion: string, changelog: any[]) {
    return this.request<any>('POST', '/updates/install', { downloadTokens, targetVersion, changelog });
  }

  // Settings
  getSettings() {
    return this.request<Record<string, any>>('GET', '/settings');
  }

  getSetting(key: string) {
    return this.request<{ key: string; value: any }>('GET', `/settings/${key}`);
  }

  saveSetting(key: string, value: any) {
    return this.request('PUT', `/settings/${key}`, { value });
  }
}

export const api = new ApiClient();
