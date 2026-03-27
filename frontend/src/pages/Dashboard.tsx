import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useVMs } from '../store/vms';
import { useWebSocket, useStorageUpdates, useNodeStatusUpdates, useNetworkUpdates } from '../hooks/useWebSocket';
import { api } from '../api/client';
import { formatBytes, formatUptime, formatPercent } from '../lib/utils';
import {
  Monitor,
  Play,
  Square,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Network,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface StorageToggle {
  hypervisorId: number;
  storageId: string;
  enabled: boolean;
}

interface NetSnapshot {
  netin: number;
  netout: number;
  timestamp: number;
}

interface NetRate {
  inRate: number;
  outRate: number;
  totalIn: number;
  totalOut: number;
}

function formatRate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}

export function Dashboard() {
  const { vms, fetchVMs, loading } = useVMs();
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [nodeStatuses, setNodeStatuses] = useState<Record<number, any>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [enabledStorages, setEnabledStorages] = useState<StorageToggle[]>([]);
  const [storageData, setStorageData] = useState<Record<number, any[]>>({});
  const [refreshingHv, setRefreshingHv] = useState<number | null>(null);
  const [netRates, setNetRates] = useState<Record<number, NetRate>>({});
  const prevSnapshots = useRef<Record<number, NetSnapshot>>({});
  const [selectedHv, setSelectedHv] = useState<number | null>(null);

  useWebSocket();

  // Listen for node status updates from WebSocket
  useNodeStatusUpdates(useCallback((hypervisorId: number, nodeStatus: any) => {
    setNodeStatuses((prev) => ({ ...prev, [hypervisorId]: nodeStatus }));
  }, []));

  // Listen for storage updates from WebSocket
  useStorageUpdates(useCallback((hypervisorId: number, storages: any[]) => {
    setStorageData((prev) => ({ ...prev, [hypervisorId]: storages }));
  }, []));

  // Listen for network updates (VM data) from WebSocket to compute traffic rates
  useNetworkUpdates(useCallback((hypervisorId: number, vmList: any[]) => {
    const now = Date.now();
    const totalIn = vmList.reduce((sum, vm) => sum + (vm.netin || 0), 0);
    const totalOut = vmList.reduce((sum, vm) => sum + (vm.netout || 0), 0);

    const prev = prevSnapshots.current[hypervisorId];
    if (prev) {
      const elapsed = (now - prev.timestamp) / 1000;
      if (elapsed > 0) {
        const deltaIn = Math.max(0, totalIn - prev.netin);
        const deltaOut = Math.max(0, totalOut - prev.netout);
        setNetRates((r) => ({
          ...r,
          [hypervisorId]: {
            inRate: deltaIn / elapsed,
            outRate: deltaOut / elapsed,
            totalIn,
            totalOut,
          },
        }));
      }
    }

    prevSnapshots.current[hypervisorId] = { netin: totalIn, netout: totalOut, timestamp: now };
  }, []));

  useEffect(() => {
    fetchVMs();
    loadHypervisors();
    loadLogs();
    loadStorageSettings();
  }, []);

  async function loadHypervisors() {
    try {
      const hvs = await api.getHypervisors();
      setHypervisors(hvs);
      for (const hv of hvs) {
        try {
          const [status, storages] = await Promise.all([
            api.getHypervisorStatus(hv.id),
            api.getHypervisorStorages(hv.id),
          ]);
          setNodeStatuses((prev) => ({ ...prev, [hv.id]: status }));
          setStorageData((prev) => ({ ...prev, [hv.id]: storages }));
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  async function refreshHypervisor(hvId: number) {
    setRefreshingHv(hvId);
    try {
      const status = await api.getHypervisorStatus(hvId);
      setNodeStatuses((prev) => ({ ...prev, [hvId]: status }));
    } catch { /* skip */ }
    setRefreshingHv(null);
  }

  async function loadStorageSettings() {
    try {
      const settings = await api.getSettings();
      setEnabledStorages(settings.dashboard_storages || []);
    } catch { /* skip */ }
  }

  async function loadLogs() {
    try {
      const data = await api.getLogs(10);
      setLogs(data);
    } catch { /* skip */ }
  }

  const realVMs = vms.filter((vm) => !vm.template && !vm.error);
  const filteredVMs = selectedHv ? realVMs.filter((vm) => vm.hypervisorId === selectedHv) : realVMs;
  const running = filteredVMs.filter((vm) => vm.status === 'running').length;
  const stopped = filteredVMs.filter((vm) => vm.status === 'stopped').length;
  const filteredHypervisors = selectedHv ? hypervisors.filter((hv) => hv.id === selectedHv) : hypervisors;

  // Build visible storages list
  const visibleStorages: { hypervisorId: number; hypervisorName: string; storage: any }[] = [];
  for (const toggle of enabledStorages) {
    if (!toggle.enabled) continue;
    const hv = hypervisors.find((h) => h.id === toggle.hypervisorId);
    const storages = storageData[toggle.hypervisorId] || [];
    const storage = storages.find((s) => s.id === toggle.storageId);
    if (hv && storage) {
      visibleStorages.push({ hypervisorId: hv.id, hypervisorName: hv.name, storage });
    }
  }

  // Filter visible storages by selected hypervisor
  const filteredStorages = selectedHv
    ? visibleStorages.filter((s) => s.hypervisorId === selectedHv)
    : visibleStorages;

  const stats = [
    { label: 'Total VMs', value: filteredVMs.length, icon: Monitor, color: 'text-primary-400' },
    { label: 'Running', value: running, icon: Play, color: 'text-green-400' },
    { label: 'Stopped', value: stopped, icon: Square, color: 'text-red-400' },
    { label: 'Hypervisors', value: selectedHv ? 1 : hypervisors.length, icon: Server, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-surface-100">Dashboard</h2>
          <p className="text-sm text-surface-500">Resource overview</p>
        </div>
        <button
          onClick={() => { fetchVMs(); loadHypervisors(); loadLogs(); }}
          disabled={loading}
          className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Hypervisor Filter */}
      {hypervisors.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedHv(null)}
            className={`px-4 py-2.5 text-xs rounded-lg transition-colors ${
              selectedHv === null
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
            }`}
          >
            All
          </button>
          {hypervisors.map((hv) => (
            <button
              key={hv.id}
              onClick={() => setSelectedHv(hv.id)}
              className={`px-4 py-2.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                selectedHv === hv.id
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              {hv.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 lg:gap-4">
              <div className="p-2.5 lg:p-3 bg-surface-900 rounded-lg shrink-0">
                <stat.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl lg:text-2xl font-bold text-surface-100">{stat.value}</p>
                <p className="text-xs text-surface-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hypervisor Nodes + Network Traffic */}
      {Object.entries(nodeStatuses).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          {filteredHypervisors.map((hv) => {
            const ns = nodeStatuses[hv.id];
            if (!ns) return null;
            const net = netRates[hv.id];
            return (
              <div key={hv.id} className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 lg:col-span-2">
                {/* Node Status Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-primary-400" />
                        <div>
                          <h3 className="font-semibold text-surface-100">{hv.name}</h3>
                          <p className="text-xs text-surface-500">{hv.host}:{hv.port} &middot; {ns.version || hv.type}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => refreshHypervisor(hv.id)}
                        disabled={refreshingHv === hv.id}
                        className="p-1.5 rounded-md hover:bg-surface-700 transition-colors text-surface-400 hover:text-surface-200 disabled:opacity-50"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-4 h-4 ${refreshingHv === hv.id ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResourceBar icon={Cpu} label="CPU" value={ns.cpu} format={formatPercent} />
                    <ResourceBar icon={MemoryStick} label="RAM" value={ns.memoryUsed / ns.memoryTotal} extra={`${formatBytes(ns.memoryUsed)} / ${formatBytes(ns.memoryTotal)}`} />
                    <ResourceBar icon={HardDrive} label="Disk" value={ns.diskUsed / ns.diskTotal} extra={`${formatBytes(ns.diskUsed)} / ${formatBytes(ns.diskTotal)}`} />
                    <div className="text-xs text-surface-500">Uptime: {formatUptime(ns.uptime)}</div>
                  </CardContent>
                </Card>

                {/* Network Traffic Card */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Network className="w-5 h-5 text-blue-400" />
                      <div>
                        <h3 className="font-semibold text-surface-100">Network Traffic</h3>
                        <p className="text-xs text-surface-500">{hv.name} &middot; VM aggregate</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {!net ? (
                      <p className="text-sm text-surface-500">Waiting for data...</p>
                    ) : (
                      <>
                        {/* IN */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowDown className="w-4 h-4 text-green-400" />
                              <span className="text-sm text-surface-300">Download</span>
                            </div>
                            <span className="text-sm font-mono font-medium text-green-400">{formatRate(net.inRate)}</span>
                          </div>
                          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all duration-1000"
                              style={{ width: `${Math.min((net.inRate / (10 * 1024 * 1024)) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-surface-500">Totale: {formatBytes(net.totalIn)}</p>
                        </div>

                        {/* OUT */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowUp className="w-4 h-4 text-blue-400" />
                              <span className="text-sm text-surface-300">Upload</span>
                            </div>
                            <span className="text-sm font-mono font-medium text-blue-400">{formatRate(net.outRate)}</span>
                          </div>
                          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-1000"
                              style={{ width: `${Math.min((net.outRate / (10 * 1024 * 1024)) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-surface-500">Totale: {formatBytes(net.totalOut)}</p>
                        </div>

                        {/* Summary */}
                        <div className="pt-2 border-t border-surface-700">
                          <div className="flex justify-between text-xs text-surface-400">
                            <span>Combined</span>
                            <span className="font-mono">{formatRate(net.inRate + net.outRate)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Storage Monitoring */}
      {filteredStorages.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-surface-100">Storage</h3>
            <Link to="/settings" className="text-xs text-primary-400 hover:text-primary-300">Configure</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {filteredStorages.map(({ hypervisorId, hypervisorName, storage }) => {
              const pct = storage.total > 0 ? (storage.used / storage.total) * 100 : 0;
              const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500';
              const textColor = pct > 90 ? 'text-red-400' : pct > 70 ? 'text-amber-400' : 'text-primary-400';
              return (
                <Card key={`${hypervisorId}-${storage.id}`}>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className={`w-4 h-4 ${textColor}`} />
                        <span className="text-sm font-medium text-surface-100">{storage.id}</span>
                      </div>
                      <span className="text-xs text-surface-500">{storage.type}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-surface-400">{hypervisorName}</span>
                        <span className={textColor}>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-surface-500">
                        <span>{formatBytes(storage.used)} used</span>
                        <span>{formatBytes(storage.total)} total</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Recent VMs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-surface-100">Virtual Machines</h3>
              <Link to="/vms" className="text-xs text-primary-400 hover:text-primary-300">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-surface-500">Loading...</div>
            ) : filteredVMs.length === 0 ? (
              <div className="p-8 text-center text-surface-500">
                No VMs found. Add a hypervisor to get started.
              </div>
            ) : (
              <div className="divide-y divide-surface-700">
                {filteredVMs.slice(0, 8).map((vm) => (
                  <Link
                    key={`${vm.hypervisorId}-${vm.vmid}`}
                    to={`/vms/${vm.hypervisorId}/${vm.vmid}`}
                    className="flex items-center justify-between px-4 lg:px-7 py-3 lg:py-4 hover:bg-surface-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-surface-400" />
                      <div>
                        <p className="text-sm font-medium text-surface-200">{vm.name}</p>
                        <p className="text-xs text-surface-500">{vm.hypervisorName}</p>
                      </div>
                    </div>
                    <StatusBadge status={vm.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-surface-100">Recent Activity</h3>
              <Link to="/logs" className="text-xs text-primary-400 hover:text-primary-300">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-surface-500">No activity</div>
            ) : (
              <div className="divide-y divide-surface-700">
                {logs.map((log) => (
                  <div key={log.id} className="px-4 lg:px-7 py-3 lg:py-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-surface-400" />
                        <span className="text-sm text-surface-200">{log.vm_name || log.vm_id}</span>
                        <span className="text-xs text-surface-500">{log.action}</span>
                      </div>
                      <span className={`text-xs ${log.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 mt-1">
                      {new Date(log.created_at).toLocaleString('en-US')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResourceBar({ icon: Icon, label, value, format, extra }: {
  icon: any; label: string; value: number; format?: (v: number) => string; extra?: string;
}) {
  const pct = Math.min(value * 100, 100);
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-surface-400">
          <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="text-surface-300">{format ? format(value) : `${pct.toFixed(1)}%`}</span>
      </div>
      <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {extra && <p className="text-xs text-surface-500">{extra}</p>}
    </div>
  );
}
