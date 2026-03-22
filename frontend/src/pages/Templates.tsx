import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { FileBox, Plus, Trash2, Download, Server } from 'lucide-react';

export function Templates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [selectedHv, setSelectedHv] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [hvFilter, setHvFilter] = useState<number | null>(null);

  const [form, setForm] = useState({
    hypervisor_id: 0, source_vm_id: '', name: '', description: '',
    default_cores: 2, default_memory_mb: 2048, default_disk_gb: 20, os_type: '',
  });

  useEffect(() => {
    load();
    api.getHypervisors().then(setHypervisors).catch(() => {});
  }, []);

  async function load() {
    const data = await api.getTemplates();
    setTemplates(data);
  }

  async function discoverFromHv(hvId: number) {
    setSelectedHv(hvId);
    const data = await api.discoverTemplates(hvId);
    setDiscovered(data);
  }

  function selectDiscovered(tmpl: any) {
    setForm({
      ...form,
      hypervisor_id: selectedHv,
      source_vm_id: tmpl.vmid,
      name: tmpl.name,
    });
  }

  async function handleSave() {
    await api.addTemplate(form);
    setShowAdd(false);
    setForm({ hypervisor_id: 0, source_vm_id: '', name: '', description: '', default_cores: 2, default_memory_mb: 2048, default_disk_gb: 20, os_type: '' });
    load();
  }

  const filteredTemplates = hvFilter ? templates.filter((t) => t.hypervisor_id === hvFilter) : templates;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    await api.deleteTemplate(deleteId);
    setDeleteId(null);
    setDeleteLoading(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-100">Templates</h2>
          <p className="text-sm text-surface-500">VM templates for quick creation</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add</Button>
      </div>

      {/* Hypervisor Filter */}
      {hypervisors.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setHvFilter(null)}
            className={`px-4 py-2.5 text-xs rounded-lg transition-colors ${
              hvFilter === null
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
            }`}
          >
            All Hypervisors
          </button>
          {hypervisors.map((hv) => (
            <button
              key={hv.id}
              onClick={() => setHvFilter(hv.id)}
              className={`px-4 py-2.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
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

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBox className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">No saved templates</p>
            <p className="text-sm text-surface-500 mt-1">Discover and save templates from your hypervisors</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t) => (
            <Card key={t.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-surface-900 rounded-lg">
                      <FileBox className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-100">{t.name}</h3>
                      <p className="text-xs text-surface-500">VM ID: {t.source_vm_id}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </Button>
                </div>
                {t.description && <p className="text-sm text-surface-400 mt-4">{t.description}</p>}
                <div className="flex gap-4 mt-4 text-xs text-surface-500">
                  <span>{t.default_cores} cores</span>
                  <span>{t.default_memory_mb} MB RAM</span>
                  <span>{t.default_disk_gb} GB</span>
                  {t.os_type && <span>{t.os_type}</span>}
                </div>
                <p className="text-xs text-surface-600 mt-3">{t.hypervisor_name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Template" className="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Discover from Hypervisor</label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-surface-200"
                value={selectedHv} onChange={(e) => setSelectedHv(Number(e.target.value))}
              >
                <option value={0}>Select...</option>
                {hypervisors.map((hv) => <option key={hv.id} value={hv.id}>{hv.name}</option>)}
              </select>
              <Button variant="secondary" size="sm" onClick={() => discoverFromHv(selectedHv)} disabled={!selectedHv}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {discovered.length > 0 && (
            <div className="space-y-2">
              {discovered.map((d) => (
                <button
                  key={d.vmid}
                  onClick={() => selectDiscovered(d)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                    form.source_vm_id === d.vmid
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-surface-700 hover:border-surface-500 text-surface-300'
                  }`}
                >
                  {d.name} (ID: {d.vmid})
                </button>
              ))}
            </div>
          )}

          <Input id="t-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input id="t-desc" label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input id="t-vmid" label="Source VM ID" value={form.source_vm_id} onChange={(e) => setForm({ ...form, source_vm_id: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <Input id="t-cores" label="Cores" type="number" value={String(form.default_cores)} onChange={(e) => setForm({ ...form, default_cores: Number(e.target.value) })} />
            <Input id="t-ram" label="RAM (MB)" type="number" value={String(form.default_memory_mb)} onChange={(e) => setForm({ ...form, default_memory_mb: Number(e.target.value) })} />
            <Input id="t-disk" label="Disk (GB)" type="number" value={String(form.default_disk_gb)} onChange={(e) => setForm({ ...form, default_disk_gb: Number(e.target.value) })} />
          </div>
          <Input id="t-os" label="OS Type" value={form.os_type} onChange={(e) => setForm({ ...form, os_type: e.target.value })} placeholder="ubuntu, debian..." />

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.source_vm_id}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Template"
      >
        <p className="text-sm text-surface-300 mb-4">
          Are you sure you want to delete the template <strong className="text-surface-100">{templates.find(t => t.id === deleteId)?.name}</strong>?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
