import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVMs } from '../store/vms';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatBytes, formatUptime, formatPercent } from '../lib/utils';
import { api } from '../api/client';
import { Monitor, Play, Square, RotateCw, Search, PlusCircle, Server, RefreshCw } from 'lucide-react';

export function VmList() {
  const { vms, loading, fetchVMs, vmAction } = useVMs();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hvFilter, setHvFilter] = useState<number | null>(null);
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchVMs();
    api.getHypervisors().then(setHypervisors).catch(() => {});
  }, []);

  const realVMs = vms.filter((vm) => !vm.template && !vm.error);

  const filtered = realVMs.filter((vm) => {
    const matchesSearch = !search ||
      vm.name.toLowerCase().includes(search.toLowerCase()) ||
      vm.vmid.includes(search);
    const matchesStatus = statusFilter === 'all' || vm.status === statusFilter;
    const matchesHv = hvFilter === null || vm.hypervisorId === hvFilter;
    return matchesSearch && matchesStatus && matchesHv;
  });

  async function handleAction(hypervisorId: number, vmId: string, action: string) {
    setActionLoading(`${vmId}-${action}`);
    try {
      await vmAction(hypervisorId, vmId, action);
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl lg:text-2xl font-bold text-surface-100">Virtual Machines</h2>
          <p className="text-sm text-surface-500">{realVMs.length} total VMs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchVMs()}
            disabled={loading}
            className="p-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link to="/create">
            <Button><PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Create VM</span></Button>
          </Link>
        </div>
      </div>

      {/* Hypervisor Filter */}
      {hypervisors.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setHvFilter(null)}
            className={`px-3 lg:px-4 py-2 lg:py-2.5 text-xs rounded-lg transition-colors ${
              hvFilter === null
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
            }`}
          >
            All
          </button>
          {hypervisors.map((hv) => (
            <button
              key={hv.id}
              onClick={() => setHvFilter(hv.id)}
              className={`px-3 lg:px-4 py-2 lg:py-2.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                hvFilter === hv.id
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

      {/* Filters */}
      <div className="flex gap-2 lg:gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-surface-900 border border-surface-700 rounded-lg text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {['all', 'running', 'stopped', 'paused'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 lg:px-4 py-2 lg:py-2.5 text-xs rounded-lg transition-colors ${
              statusFilter === s
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* VM Content */}
      {loading ? (
        <div className="p-12 text-center text-surface-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-surface-500">
            {realVMs.length === 0 ? 'No VMs found. Configure a hypervisor.' : 'No results.'}
          </div>
        </Card>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="lg:hidden space-y-3">
            {filtered.map((vm) => (
              <Card key={`${vm.hypervisorId}-${vm.vmid}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/vms/${vm.hypervisorId}/${vm.vmid}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <Monitor className="w-4 h-4 text-surface-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-surface-200 truncate">{vm.name}</p>
                        <p className="text-xs text-surface-500">ID: {vm.vmid} &middot; {vm.hypervisorName}</p>
                      </div>
                    </Link>
                    <StatusBadge status={vm.status} />
                  </div>

                  {vm.status === 'running' && (
                    <div className="flex gap-4 mt-3 text-xs text-surface-400">
                      <span>CPU: {formatPercent(vm.cpu)} / {vm.cpuCount}c</span>
                      <span>RAM: {formatBytes(vm.memoryUsed)}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-700">
                    {vm.status === 'stopped' && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'start')}
                        disabled={actionLoading === `${vm.vmid}-start`}
                      >
                        <Play className="w-3.5 h-3.5 text-green-400" /> Start
                      </Button>
                    )}
                    {vm.status === 'running' && (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'restart')}
                          disabled={actionLoading === `${vm.vmid}-restart`}
                        >
                          <RotateCw className="w-3.5 h-3.5 text-amber-400" /> Restart
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'stop')}
                          disabled={actionLoading === `${vm.vmid}-stop`}
                        >
                          <Square className="w-3.5 h-3.5 text-red-400" /> Stop
                        </Button>
                      </>
                    )}
                    <Link to={`/vms/${vm.hypervisorId}/${vm.vmid}`} className="ml-auto text-xs text-primary-400 hover:text-primary-300">
                      Details
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <Card>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-700 text-left text-xs text-surface-500 uppercase">
                    <th className="px-7 py-4">VM</th>
                    <th className="px-7 py-4">Status</th>
                    <th className="px-7 py-4">CPU</th>
                    <th className="px-7 py-4">RAM</th>
                    <th className="px-7 py-4">Uptime</th>
                    <th className="px-7 py-4">Hypervisor</th>
                    <th className="px-7 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700">
                  {filtered.map((vm) => (
                    <tr key={`${vm.hypervisorId}-${vm.vmid}`} className="hover:bg-surface-700/30 transition-colors">
                      <td className="px-7 py-4">
                        <Link to={`/vms/${vm.hypervisorId}/${vm.vmid}`} className="flex items-center gap-3 hover:text-primary-400">
                          <Monitor className="w-4 h-4 text-surface-400" />
                          <div>
                            <p className="font-medium text-surface-200">{vm.name}</p>
                            <p className="text-xs text-surface-500">ID: {vm.vmid}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-7 py-4"><StatusBadge status={vm.status} /></td>
                      <td className="px-7 py-4 text-surface-300">
                        {vm.status === 'running' ? formatPercent(vm.cpu) : '-'} <span className="text-surface-500">/ {vm.cpuCount}c</span>
                      </td>
                      <td className="px-7 py-4 text-surface-300">
                        {vm.status === 'running' ? formatBytes(vm.memoryUsed) : '-'}
                        <span className="text-surface-500"> / {formatBytes(vm.memoryTotal)}</span>
                      </td>
                      <td className="px-7 py-4 text-surface-300">
                        {vm.status === 'running' ? formatUptime(vm.uptime) : '-'}
                      </td>
                      <td className="px-7 py-4 text-surface-400 text-xs">{vm.hypervisorName}</td>
                      <td className="px-7 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          {vm.status === 'stopped' && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'start')}
                              disabled={actionLoading === `${vm.vmid}-start`}
                            >
                              <Play className="w-3.5 h-3.5 text-green-400" />
                            </Button>
                          )}
                          {vm.status === 'running' && (
                            <>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'restart')}
                                disabled={actionLoading === `${vm.vmid}-restart`}
                              >
                                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => handleAction(vm.hypervisorId, vm.vmid, 'stop')}
                                disabled={actionLoading === `${vm.vmid}-stop`}
                              >
                                <Square className="w-3.5 h-3.5 text-red-400" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
