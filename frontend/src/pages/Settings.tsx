import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../store/auth';
import { Lock, User, HardDrive, Server, Eye, EyeOff } from 'lucide-react';
import { formatBytes } from '../lib/utils';

interface StorageToggle {
  hypervisorId: number;
  storageId: string;
  enabled: boolean;
}

export function Settings() {
  const user = useAuth((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Storage settings
  const [hypervisors, setHypervisors] = useState<any[]>([]);
  const [storagesByHv, setStoragesByHv] = useState<Record<number, any[]>>({});
  const [dashboardStorages, setDashboardStorages] = useState<StorageToggle[]>([]);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageSaving, setStorageSaving] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');

  useEffect(() => {
    loadStorageConfig();
  }, []);

  async function loadStorageConfig() {
    setStorageLoading(true);
    try {
      const [hvs, settings] = await Promise.all([
        api.getHypervisors(),
        api.getSettings(),
      ]);
      setHypervisors(hvs);

      const saved: StorageToggle[] = settings.dashboard_storages || [];
      setDashboardStorages(saved);

      // Fetch storages for each hypervisor
      const storageMap: Record<number, any[]> = {};
      await Promise.all(
        hvs.map(async (hv: any) => {
          try {
            storageMap[hv.id] = await api.getHypervisorStorages(hv.id);
          } catch {
            storageMap[hv.id] = [];
          }
        })
      );
      setStoragesByHv(storageMap);
    } catch { /* skip */ }
    setStorageLoading(false);
  }

  function isStorageEnabled(hypervisorId: number, storageId: string) {
    return dashboardStorages.some(
      (s) => s.hypervisorId === hypervisorId && s.storageId === storageId && s.enabled
    );
  }

  async function toggleStorage(hypervisorId: number, storageId: string) {
    const existing = dashboardStorages.find(
      (s) => s.hypervisorId === hypervisorId && s.storageId === storageId
    );

    let updated: StorageToggle[];
    if (existing) {
      updated = dashboardStorages.map((s) =>
        s.hypervisorId === hypervisorId && s.storageId === storageId
          ? { ...s, enabled: !s.enabled }
          : s
      );
    } else {
      updated = [...dashboardStorages, { hypervisorId, storageId, enabled: true }];
    }

    setDashboardStorages(updated);
    setStorageSaving(true);
    setStorageMessage('');

    try {
      await api.saveSetting('dashboard_storages', updated);
      setStorageMessage('Salvato');
      setTimeout(() => setStorageMessage(''), 2000);
    } catch {
      setStorageMessage('Errore nel salvataggio');
    }
    setStorageSaving(false);
  }

  async function handleChangePassword() {
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (newPassword.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage('Password aggiornata con successo');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-surface-100">Impostazioni</h2>
        <p className="text-sm text-surface-500">Gestisci il tuo account e la dashboard</p>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-surface-100">Profilo</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/15 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary-400">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="font-medium text-surface-200">{user?.username}</p>
              <p className="text-sm text-surface-500">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-primary-400" />
              <h3 className="font-semibold text-surface-100">Storage in Dashboard</h3>
            </div>
            {storageMessage && (
              <span className={`text-xs ${storageMessage === 'Salvato' ? 'text-green-400' : 'text-red-400'}`}>
                {storageMessage}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {storageLoading ? (
            <p className="text-sm text-surface-500">Caricamento storage...</p>
          ) : hypervisors.length === 0 ? (
            <p className="text-sm text-surface-500">Nessun hypervisor configurato.</p>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-surface-500">
                Scegli quali storage visualizzare nella dashboard. I dati si aggiornano in tempo reale.
              </p>
              {hypervisors.map((hv) => {
                const storages = storagesByHv[hv.id] || [];
                return (
                  <div key={hv.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="w-4 h-4 text-surface-400" />
                      <span className="text-sm font-medium text-surface-200">{hv.name}</span>
                      <span className="text-xs text-surface-500">{hv.host}</span>
                    </div>
                    {storages.length === 0 ? (
                      <p className="text-xs text-surface-500 ml-6">Nessuno storage trovato</p>
                    ) : (
                      <div className="space-y-2 ml-6">
                        {storages.map((storage) => {
                          const enabled = isStorageEnabled(hv.id, storage.id);
                          return (
                            <button
                              key={storage.id}
                              onClick={() => toggleStorage(hv.id, storage.id)}
                              disabled={storageSaving}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                                enabled
                                  ? 'border-primary-500/40 bg-primary-500/10'
                                  : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <HardDrive className={`w-4 h-4 ${enabled ? 'text-primary-400' : 'text-surface-500'}`} />
                                <div className="text-left">
                                  <p className={`text-sm font-medium ${enabled ? 'text-surface-100' : 'text-surface-400'}`}>
                                    {storage.id}
                                  </p>
                                  <p className="text-xs text-surface-500">
                                    {storage.type} &middot; {formatBytes(storage.used)} / {formatBytes(storage.total)}
                                    {storage.content && ` \u00b7 ${storage.content}`}
                                  </p>
                                </div>
                              </div>
                              {enabled ? (
                                <Eye className="w-4 h-4 text-primary-400" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-surface-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary-400" />
            <h3 className="font-semibold text-surface-100">Cambia Password</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-5 py-3.5">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-5 py-3.5">
              {error}
            </div>
          )}
          <Input
            id="current" label="Password Attuale" type="password"
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            id="new" label="Nuova Password" type="password"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            id="confirm" label="Conferma Password" type="password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button onClick={handleChangePassword} disabled={!currentPassword || !newPassword}>
            Aggiorna Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
