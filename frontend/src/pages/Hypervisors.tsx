import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Server, Plus, Trash2, CheckCircle2, XCircle, Pencil } from 'lucide-react';

export function Hypervisors() {
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, boolean | null>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'proxmox', host: '', port: 8006, node: 'pve',
    api_token_id: '', api_token_secret: '', verify_ssl: false,
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await api.getHypervisors();
    setHypervisors(data);
  }

  function resetForm() {
    setForm({ name: '', type: 'proxmox', host: '', port: 8006, node: 'pve', api_token_id: '', api_token_secret: '', verify_ssl: false });
    setEditId(null);
  }

  async function handleSave() {
    if (editId) {
      await api.updateHypervisor(editId, form);
    } else {
      await api.addHypervisor(form);
    }
    setShowAdd(false);
    resetForm();
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteLoading(true);
    await api.deleteHypervisor(deleteId);
    setDeleteId(null);
    setDeleteLoading(false);
    load();
  }

  async function handleTest(id: number) {
    setTestResults((prev) => ({ ...prev, [id]: null }));
    const result = await api.testHypervisor(id);
    setTestResults((prev) => ({ ...prev, [id]: result.connected }));
  }

  function openEdit(hv: any) {
    setForm({
      name: hv.name, type: hv.type, host: hv.host, port: hv.port, node: hv.node || 'pve',
      api_token_id: '', api_token_secret: '', verify_ssl: false,
    });
    setEditId(hv.id);
    setShowAdd(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-100">Hypervisors</h2>
          <p className="text-sm text-surface-500">Gestisci le connessioni agli hypervisor</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAdd(true); }}>
          <Plus className="w-4 h-4" /> Aggiungi
        </Button>
      </div>

      {hypervisors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            <p className="text-surface-400">Nessun hypervisor configurato</p>
            <p className="text-sm text-surface-500 mt-1">Aggiungi il tuo primo hypervisor per iniziare</p>
            <Button className="mt-4" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Aggiungi Hypervisor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {hypervisors.map((hv) => (
            <Card key={hv.id}>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="p-2.5 sm:p-3 bg-surface-900 rounded-lg shrink-0">
                      <Server className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-surface-100 truncate">{hv.name}</h3>
                        {testResults[hv.id] === true && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                        {testResults[hv.id] === false && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      </div>
                      <p className="text-sm text-surface-500 truncate">{hv.type} - {hv.host}:{hv.port}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 pl-[52px] sm:pl-0">
                    <Button variant="secondary" size="sm" onClick={() => handleTest(hv.id)}>Test</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(hv)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(hv.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? 'Modifica Hypervisor' : 'Aggiungi Hypervisor'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input id="hv-name" label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Proxmox Main" />
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">Tipo</label>
            <select
              className="w-full px-4 py-2.5 bg-surface-900 border border-surface-600 rounded-lg text-sm text-surface-200"
              value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="proxmox">Proxmox VE</option>
              <option value="vmware" disabled>VMware ESXi (prossimamente)</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input id="hv-host" label="Host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.10" />
            </div>
            <Input id="hv-port" label="Porta" type="number" value={String(form.port)} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
          </div>
          <Input id="hv-node" label="Nome Nodo" value={form.node} onChange={(e) => setForm({ ...form, node: e.target.value })} placeholder="pve" />
          <Input id="hv-token-id" label="API Token ID" value={form.api_token_id} onChange={(e) => setForm({ ...form, api_token_id: e.target.value })} placeholder="user@pam!tokenname" />
          <Input id="hv-token-secret" label="API Token Secret" type="password" value={form.api_token_secret} onChange={(e) => setForm({ ...form, api_token_secret: e.target.value })} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowAdd(false); resetForm(); }}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.host || !form.api_token_id}>
              {editId ? 'Salva' : 'Aggiungi'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Elimina Hypervisor"
      >
        <p className="text-sm text-surface-300 mb-4">
          Sei sicuro di voler eliminare l'hypervisor <strong className="text-surface-100">{hypervisors.find(h => h.id === deleteId)?.name}</strong>? Tutte le VM associate non saranno piu' gestibili da VIBEVps.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
