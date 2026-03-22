import { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, Package, Calendar, FileText, Key, Server, AlertTriangle, Plus } from 'lucide-react';
import { api } from '../api/client';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseDate?: string;
  changelog?: ChangelogEntry[];
  downloadToken?: string;
  downloadTokens?: Record<string, string>;
  downloadUrl?: string;
}

interface LicenseData {
  serverId: string;
  appVersion: string;
  license?: {
    licenseKey: string;
    planName: string;
    customerName: string;
    maxHypervisors: number;
    maxVms: number;
    expiresAt: string | null;
    isLifetime: boolean;
  };
}

export function Updates() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showNewLicense, setShowNewLicense] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [newLicenseEmail, setNewLicenseEmail] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [license, updates] = await Promise.all([
        api.getLicenseInfo(),
        api.checkForUpdates(),
      ]);
      setLicenseInfo(license);
      setUpdateInfo(updates);
    } catch {
      setError('Unable to load update information');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) window.open(updateInfo.downloadUrl, '_blank');
  };

  const handleInstall = async () => {
    if (!updateInfo?.downloadTokens && !updateInfo?.downloadToken) return;
    setInstalling(true);
    setInstallMessage({ type: 'info', text: 'Downloading and installing...' });

    try {
      // Use downloadTokens (object) if available, otherwise build from single token
      const tokens = updateInfo.downloadTokens || (updateInfo.latestVersion && updateInfo.downloadToken
        ? { [updateInfo.latestVersion]: updateInfo.downloadToken }
        : {});
      const data = await api.installUpdate(tokens, updateInfo.latestVersion!, updateInfo.changelog!);
      if (data.success) {
        setInstallMessage({
          type: 'success',
          text: 'Update started! The application will restart automatically.',
        });
        setTimeout(() => window.location.reload(), 15000);
      } else {
        setInstallMessage({ type: 'error', text: data.error || 'Installation failed' });
        setInstalling(false);
      }
    } catch {
      setInstallMessage({ type: 'error', text: 'Error during installation. Check server logs.' });
      setInstalling(false);
    }
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicenseKey.trim()) return;

    if (!newLicenseKey.trim().startsWith('VV-')) {
      setActivationMessage({ type: 'error', text: 'Invalid key format. License must start with VV-' });
      return;
    }
    if (!newLicenseEmail.trim()) {
      setActivationMessage({ type: 'error', text: 'Customer email is required.' });
      return;
    }

    setActivating(true);
    setActivationMessage(null);

    try {
      const data = await api.activateLicense(newLicenseKey.trim(), newLicenseEmail.trim());
      if (data.success) {
        setActivationMessage({ type: 'success', text: 'License activated successfully!' });
        setNewLicenseKey('');
        setNewLicenseEmail('');
        setShowNewLicense(false);
        await loadData();
      } else if (data.status === 'email_mismatch') {
        setActivationMessage({ type: 'error', text: 'The provided email does not match our records.' });
      } else {
        setActivationMessage({ type: 'error', text: data.message || 'Activation failed' });
      }
    } catch {
      setActivationMessage({ type: 'error', text: 'Unable to connect to license server' });
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-surface-100">Updates</h1>
          <p className="text-sm text-surface-400">Check for updates and manage your license</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 lg:px-4 py-2 text-surface-300 hover:bg-surface-800 rounded-lg transition shrink-0"
        >
          <RefreshCw className="w-5 h-5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Install message */}
      {installMessage && (
        <div className={`p-4 rounded-xl flex gap-3 ${
          installMessage.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : installMessage.type === 'error'
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-primary-500/10 border border-primary-500/30'
        }`}>
          {installMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : installMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          ) : (
            <RefreshCw className="w-5 h-5 text-primary-400 shrink-0 animate-spin" />
          )}
          <div>
            <p className={
              installMessage.type === 'success' ? 'text-emerald-300'
              : installMessage.type === 'error' ? 'text-red-300'
              : 'text-primary-300'
            }>{installMessage.text}</p>
            {installMessage.type === 'success' && (
              <p className="text-sm text-emerald-400 mt-1">The page will reload automatically...</p>
            )}
          </div>
        </div>
      )}

      {/* Activation message */}
      {activationMessage && (
        <div className={`p-4 rounded-xl flex gap-3 ${
          activationMessage.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {activationMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <p className={activationMessage.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>
            {activationMessage.text}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Version & Update Status */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4 lg:mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-400" />
            Software Version
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 bg-surface-800 rounded-lg">
              <div>
                <p className="text-sm text-surface-400">Current Version</p>
                <p className="text-xl font-semibold text-surface-100">v{updateInfo?.currentVersion || '1.0.0'}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/15 text-emerald-400 rounded-full text-sm w-fit">
                <CheckCircle className="w-4 h-4" />
                Installed
              </div>
            </div>

            {updateInfo?.updateAvailable ? (
              <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                  <div>
                    <p className="text-sm text-primary-400 font-medium">New Version Available!</p>
                    <p className="text-2xl font-bold text-primary-300">v{updateInfo.latestVersion}</p>
                    {updateInfo.releaseDate && (
                      <p className="text-sm text-primary-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-4 h-4" />
                        Released: {new Date(updateInfo.releaseDate).toLocaleDateString('en-US')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleInstall}
                      disabled={installing || (!updateInfo.downloadTokens && !updateInfo.downloadToken)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      {installing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      {installing ? 'Installing...' : 'Install'}
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={installing || !updateInfo.downloadUrl}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-500/10 rounded-lg disabled:opacity-50 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download Only
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-300">You're up to date!</p>
                    <p className="text-sm text-emerald-400">You have the latest version installed.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* License Info */}
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 lg:mb-6">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary-400" />
              License
            </h2>
            <button
              onClick={() => setShowNewLicense(!showNewLicense)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-400 hover:bg-primary-500/10 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              {showNewLicense ? 'Cancel' : 'Update License'}
            </button>
          </div>

          {/* New License Form */}
          {showNewLicense && (
            <form onSubmit={handleActivateLicense} className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
              <label className="block text-sm font-medium text-primary-300 mb-2">
                License Key *
              </label>
              <input
                type="text"
                value={newLicenseKey}
                onChange={(e) => setNewLicenseKey(e.target.value.toUpperCase())}
                placeholder="VV-XXXX-XXXX-XXXX"
                required
                className="w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg font-mono text-sm text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <label className="block text-sm font-medium text-primary-300 mb-2 mt-3">
                Customer Email *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newLicenseEmail}
                  onChange={(e) => setNewLicenseEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="flex-1 px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={activating || !newLicenseKey.trim() || !newLicenseEmail.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                >
                  {activating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Activate
                </button>
              </div>
              <p className="text-xs text-primary-400 mt-2">
                This will replace the current license. The email must match the one associated with the license.
              </p>
            </form>
          )}

          {licenseInfo?.license ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                <div className="p-3 bg-surface-800 rounded-lg">
                  <p className="text-xs text-surface-500 uppercase">Plan</p>
                  <p className="font-semibold text-surface-100">{licenseInfo.license.planName || 'N/A'}</p>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg">
                  <p className="text-xs text-surface-500 uppercase">Customer</p>
                  <p className="font-semibold text-surface-100">{licenseInfo.license.customerName || 'N/A'}</p>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg">
                  <p className="text-xs text-surface-500 uppercase">Max Hypervisors</p>
                  <p className="font-semibold text-surface-100">
                    {licenseInfo.license.maxHypervisors === 0 ? 'Unlimited' : licenseInfo.license.maxHypervisors}
                  </p>
                </div>
                <div className="p-3 bg-surface-800 rounded-lg">
                  <p className="text-xs text-surface-500 uppercase">Max VMs</p>
                  <p className="font-semibold text-surface-100">
                    {licenseInfo.license.maxVms === 0 ? 'Unlimited' : licenseInfo.license.maxVms}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-surface-800 rounded-lg">
                <p className="text-xs text-surface-500 uppercase">License Key</p>
                <p className="font-mono text-sm text-surface-100">{licenseInfo.license.licenseKey}</p>
              </div>

              <div className="p-3 bg-surface-800 rounded-lg">
                <p className="text-xs text-surface-500 uppercase">Expiration</p>
                <p className="font-semibold text-surface-100">
                  {licenseInfo.license.isLifetime
                    ? 'Lifetime (Never expires)'
                    : licenseInfo.license.expiresAt
                      ? new Date(licenseInfo.license.expiresAt).toLocaleDateString('en-US')
                      : 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-surface-800 rounded-lg">
                <p className="text-xs text-surface-500 uppercase flex items-center gap-1">
                  <Server className="w-3 h-3" /> Server ID
                </p>
                <p className="font-mono text-xs text-surface-400 break-all">{licenseInfo.serverId}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-surface-800 rounded-lg">
              <p className="text-surface-400">No active license. Updates are free and always available.</p>
              <p className="text-xs text-surface-500 mt-1">An optional license can unlock future premium features.</p>
            </div>
          )}
        </div>
      </div>

      {/* Changelog */}
      {updateInfo?.changelog && updateInfo.changelog.length > 0 && (
        <div className="bg-surface-900 border border-surface-700 rounded-xl p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-surface-100 mb-4 lg:mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            Changelog
          </h2>

          <div className="space-y-6">
            {updateInfo.changelog.map((entry, index) => (
              <div key={entry.version} className="relative pl-6">
                {index !== updateInfo.changelog!.length - 1 && (
                  <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-surface-700" />
                )}
                <div className="absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-surface-100">v{entry.version}</span>
                    <span className="text-sm text-surface-400">{entry.date}</span>
                    {index === 0 && updateInfo.updateAvailable && (
                      <span className="px-2 py-0.5 bg-primary-500/15 text-primary-400 text-xs rounded-full">Latest</span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {entry.changes.map((change, i) => (
                      <li key={i} className="text-sm text-surface-300 flex items-start gap-2">
                        <span className="text-primary-500 mt-1">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
