import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { formatBytes, formatUptime, formatPercent } from '../lib/utils';
import {
  ArrowLeft, Play, Square, RotateCw, Pause, Trash2,
  Cpu, MemoryStick, HardDrive, Network, Clock, Monitor,
} from 'lucide-react';

export function VmDetail() {
  const { hypervisorId, vmId } = useParams();
  const navigate = useNavigate();
  const [vm, setVm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { loadVM(); }, [hypervisorId, vmId]);

  async function loadVM() {
    try {
      const data = await api.getVM(Number(hypervisorId), vmId!);
      setVm(data);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      await api.vmAction(Number(hypervisorId), vmId!, action);
      setTimeout(loadVM, 2000);
    } catch { /* ignore */ }
    setActionLoading(false);
  }

  async function handleDelete() {
    setActionLoading(true);
    try {
      await api.deleteVM(Number(hypervisorId), vmId!);
      navigate('/vms');
    } catch { /* ignore */ }
    setActionLoading(false);
    setShowDelete(false);
  }

  if (loading) return <div className="p-12 text-center text-surface-500">Caricamento...</div>;
  if (!vm) return <div className="p-12 text-center text-surface-500">VM non trovata</div>;

  const infoItems = [
    { icon: Cpu, label: 'CPU', value: `${vm.cpuCount} cores${vm.status === 'running' ? ` (${formatPercent(vm.cpu)})` : ''}` },
    { icon: MemoryStick, label: 'RAM', value: `${formatBytes(vm.memoryTotal)}${vm.status === 'running' ? ` (${formatBytes(vm.memoryUsed)} usata)` : ''}` },
    { icon: HardDrive, label: 'Disco', value: formatBytes(vm.diskTotal) },
    { icon: Clock, label: 'Uptime', value: vm.status === 'running' ? formatUptime(vm.uptime) : '-' },
    { icon: Network, label: 'Rete In/Out', value: vm.status === 'running' ? `${formatBytes(vm.netin)} / ${formatBytes(vm.netout)}` : '-' },
    { icon: Monitor, label: 'ID', value: vm.vmid },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/vms')} className="text-surface-400 hover:text-surface-200">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-surface-100">{vm.name}</h2>
            <StatusBadge status={vm.status} />
          </div>
          <p className="text-sm text-surface-500">VM ID: {vm.vmid}</p>
        </div>
        <div className="flex items-center gap-3">
          {vm.status === 'stopped' && (
            <Button onClick={() => handleAction('start')} disabled={actionLoading}>
              <Play className="w-4 h-4" /> Avvia
            </Button>
          )}
          {vm.status === 'running' && (
            <>
              <Button variant="secondary" onClick={() => handleAction('restart')} disabled={actionLoading}>
                <RotateCw className="w-4 h-4" /> Riavvia
              </Button>
              <Button variant="secondary" onClick={() => handleAction('suspend')} disabled={actionLoading}>
                <Pause className="w-4 h-4" /> Sospendi
              </Button>
              <Button variant="danger" onClick={() => handleAction('stop')} disabled={actionLoading}>
                <Square className="w-4 h-4" /> Ferma
              </Button>
            </>
          )}
          <Button variant="danger" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4" /> Elimina
          </Button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {infoItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-4">
              <div className="p-2.5 bg-surface-900 rounded-lg">
                <item.icon className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-surface-500">{item.label}</p>
                <p className="text-sm font-medium text-surface-200">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config */}
      {vm.config && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-surface-100">Configurazione</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {Object.entries(vm.config)
                .filter(([key]) => !key.startsWith('digest') && !key.startsWith('pending'))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-surface-500 font-mono text-xs min-w-[120px]">{key}:</span>
                    <span className="text-surface-300 text-xs break-all">{String(value)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Elimina VM">
        <p className="text-sm text-surface-300 mb-4">
          Sei sicuro di voler eliminare <strong className="text-surface-100">{vm.name}</strong>? Questa azione e' irreversibile.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowDelete(false)}>Annulla</Button>
          <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
            {actionLoading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
