import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  FileBox, Server, Globe, Cpu, Rocket, ChevronRight, ChevronLeft, Check, Wifi,
} from 'lucide-react';

const steps = [
  { icon: FileBox, label: 'Template' },
  { icon: Server, label: 'Identita' },
  { icon: Globe, label: 'Rete' },
  { icon: Cpu, label: 'Risorse' },
  { icon: Rocket, label: 'Riepilogo' },
];

export function CreateVm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [discoveredTemplates, setDiscoveredTemplates] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    hypervisor_id: 0,
    template_vm_id: '',
    template_name: '',
    name: '',
    hostname: '',
    network_mode: 'static' as 'dhcp' | 'static',
    ip: '',
    netmask: '255.255.255.0',
    gateway: '',
    dns: '8.8.8.8,1.1.1.1',
    cores: 2,
    memory_mb: 2048,
    disk_gb: 20,
    auto_update: true,
    packages: '',
    ssh_keys: '',
  });

  useEffect(() => {
    api.getHypervisors().then(setHypervisors).catch(() => {});
    api.getTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.hypervisor_id > 0) {
      api.discoverTemplates(form.hypervisor_id).then(setDiscoveredTemplates).catch(() => {});
    }
  }, [form.hypervisor_id]);

  function update(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function selectTemplate(tmpl: any) {
    update('template_vm_id', tmpl.vmid || tmpl.source_vm_id);
    update('template_name', tmpl.name);
    if (tmpl.default_cores) update('cores', tmpl.default_cores);
    if (tmpl.default_memory_mb) update('memory_mb', tmpl.default_memory_mb);
    if (tmpl.default_disk_gb) update('disk_gb', tmpl.default_disk_gb);
  }

  const isDhcp = form.network_mode === 'dhcp';

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      const network: any = {
        mode: form.network_mode,
        dns: form.dns ? form.dns.split(',').map((d) => d.trim()).filter(Boolean) : [],
      };
      if (!isDhcp) {
        network.ip = form.ip;
        network.netmask = form.netmask;
        network.gateway = form.gateway;
      }

      const result = await api.createVM({
        hypervisor_id: form.hypervisor_id,
        template_vm_id: form.template_vm_id,
        name: form.name,
        hostname: form.hostname,
        network,
        resources: {
          cores: form.cores,
          memory_mb: form.memory_mb,
          disk_gb: form.disk_gb,
        },
        post_install: {
          auto_update: form.auto_update,
          packages: form.packages ? form.packages.split(',').map((p) => p.trim()) : undefined,
          ssh_keys: form.ssh_keys ? form.ssh_keys.split('\n').filter(Boolean) : undefined,
        },
      });
      navigate(`/vms/${form.hypervisor_id}/${result.vmId}`);
    } catch (e: any) {
      setError(e.message);
    }
    setCreating(false);
  }

  const allTemplates = [
    ...templates.map((t) => ({ ...t, source: 'saved', vmid: t.source_vm_id })),
    ...discoveredTemplates.map((t) => ({ ...t, source: 'discovered' })),
  ];

  // Validation for step navigation
  const canAdvance =
    (step === 0 && form.hypervisor_id > 0 && !!form.template_vm_id) ||
    (step === 1 && !!form.name && !!form.hostname) ||
    (step === 2 && (isDhcp || (!!form.ip && !!form.gateway))) ||
    step === 3;

  return (
    <div className="space-y-4 lg:space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-100">Crea Virtual Machine</h2>
        <p className="text-sm text-surface-500">Crea una nuova VM da template</p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs transition-colors ${
                i === step
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                  : i < step
                  ? 'bg-surface-800 text-primary-400'
                  : 'bg-surface-800 text-surface-500'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-surface-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-5 py-3.5">{error}</div>
      )}

      <Card>
        <CardContent className="space-y-5">
          {/* Step 0: Template */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Hypervisor</label>
                <select
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  value={form.hypervisor_id}
                  onChange={(e) => update('hypervisor_id', Number(e.target.value))}
                >
                  <option value={0}>Seleziona hypervisor...</option>
                  {hypervisors.map((hv) => (
                    <option key={hv.id} value={hv.id}>{hv.name} ({hv.host})</option>
                  ))}
                </select>
              </div>

              {form.hypervisor_id > 0 && (
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">Template</label>
                  {allTemplates.length === 0 ? (
                    <p className="text-sm text-surface-500">Nessun template trovato per questo hypervisor.</p>
                  ) : (
                    <div className="grid gap-3">
                      {allTemplates.map((t) => (
                        <button
                          key={`${t.source}-${t.vmid}`}
                          onClick={() => selectTemplate(t)}
                          className={`text-left px-5 py-3.5 rounded-lg border transition-colors ${
                            form.template_vm_id === (t.vmid || t.source_vm_id)
                              ? 'border-primary-500 bg-primary-500/10'
                              : 'border-surface-700 bg-surface-900 hover:border-surface-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-surface-200">{t.name}</p>
                              <p className="text-xs text-surface-500">
                                ID: {t.vmid || t.source_vm_id}
                                {t.os_type && ` - ${t.os_type}`}
                                {t.source === 'saved' && ' (salvato)'}
                              </p>
                            </div>
                            {form.template_vm_id === (t.vmid || t.source_vm_id) && (
                              <Check className="w-4 h-4 text-primary-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                id="name" label="Nome VM"
                value={form.name}
                onChange={(e) => {
                  update('name', e.target.value);
                  if (!form.hostname || form.hostname === form.name) {
                    update('hostname', e.target.value);
                  }
                }}
                placeholder="web-server-01"
              />
              <Input
                id="hostname" label="Hostname"
                value={form.hostname}
                onChange={(e) => update('hostname', e.target.value)}
                placeholder="web-server-01"
              />
            </div>
          )}

          {/* Step 2: Network */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Network Mode Toggle */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Modalita Rete</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => update('network_mode', 'dhcp')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      isDhcp
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-500'
                    }`}
                  >
                    <Wifi className="w-4 h-4" />
                    DHCP
                  </button>
                  <button
                    onClick={() => update('network_mode', 'static')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      !isDhcp
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-500'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    IP Statico
                  </button>
                </div>
              </div>

              {isDhcp ? (
                <div className="bg-surface-900/50 border border-surface-700 rounded-lg px-5 py-4">
                  <p className="text-sm text-surface-400">
                    La VM otterr&agrave; automaticamente un indirizzo IP dal server DHCP della rete.
                  </p>
                </div>
              ) : (
                <>
                  <Input id="ip" label="Indirizzo IP" value={form.ip} onChange={(e) => update('ip', e.target.value)} placeholder="192.168.1.100" />
                  <Input id="netmask" label="Netmask" value={form.netmask} onChange={(e) => update('netmask', e.target.value)} placeholder="255.255.255.0" />
                  <Input id="gateway" label="Gateway" value={form.gateway} onChange={(e) => update('gateway', e.target.value)} placeholder="192.168.1.1" />
                </>
              )}

              <Input id="dns" label="DNS (separati da virgola, opzionale con DHCP)" value={form.dns} onChange={(e) => update('dns', e.target.value)} placeholder="8.8.8.8,1.1.1.1" />
            </div>
          )}

          {/* Step 3: Resources */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">CPU Cores: {form.cores}</label>
                <input
                  type="range" min={1} max={16} value={form.cores}
                  onChange={(e) => update('cores', Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">RAM: {form.memory_mb} MB ({(form.memory_mb / 1024).toFixed(1)} GB)</label>
                <input
                  type="range" min={512} max={32768} step={512} value={form.memory_mb}
                  onChange={(e) => update('memory_mb', Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">Disco: {form.disk_gb} GB</label>
                <input
                  type="range" min={5} max={500} step={5} value={form.disk_gb}
                  onChange={(e) => update('disk_gb', Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox" id="auto_update" checked={form.auto_update}
                  onChange={(e) => update('auto_update', e.target.checked)}
                  className="accent-primary-500"
                />
                <label htmlFor="auto_update" className="text-sm text-surface-300">Auto-update al primo avvio</label>
              </div>
              <Input
                id="packages" label="Pacchetti extra (separati da virgola)"
                value={form.packages}
                onChange={(e) => update('packages', e.target.value)}
                placeholder="nginx,curl,htop"
              />
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2.5">SSH Keys (una per riga)</label>
                <textarea
                  className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 h-24 resize-none"
                  value={form.ssh_keys}
                  onChange={(e) => update('ssh_keys', e.target.value)}
                  placeholder="ssh-rsa AAAA..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-surface-100 mb-3">Riepilogo</h3>
              <SummaryRow label="Template" value={`${form.template_name} (${form.template_vm_id})`} />
              <SummaryRow label="Nome VM" value={form.name} />
              <SummaryRow label="Hostname" value={form.hostname} />
              <SummaryRow label="Rete" value={isDhcp ? 'DHCP (automatico)' : `${form.ip}/${form.netmask}`} />
              {!isDhcp && <SummaryRow label="Gateway" value={form.gateway} />}
              {form.dns && <SummaryRow label="DNS" value={form.dns} />}
              <SummaryRow label="CPU" value={`${form.cores} cores`} />
              <SummaryRow label="RAM" value={`${form.memory_mb} MB`} />
              <SummaryRow label="Disco" value={`${form.disk_gb} GB`} />
              <SummaryRow label="Auto-update" value={form.auto_update ? 'Si' : 'No'} />
              {form.packages && <SummaryRow label="Pacchetti" value={form.packages} />}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>
          <ChevronLeft className="w-4 h-4" /> Indietro
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canAdvance}>
            Avanti <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={creating}>
            <Rocket className="w-4 h-4" /> {creating ? 'Creazione...' : 'Crea VM'}
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-surface-700">
      <span className="text-sm text-surface-400">{label}</span>
      <span className="text-sm text-surface-200 font-medium">{value}</span>
    </div>
  );
}
