import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card } from '../components/ui/Card';
import { Activity } from 'lucide-react';

const actionColors: Record<string, string> = {
  create: 'text-green-400 bg-green-400/10',
  start: 'text-blue-400 bg-blue-400/10',
  stop: 'text-red-400 bg-red-400/10',
  restart: 'text-amber-400 bg-amber-400/10',
  delete: 'text-red-400 bg-red-400/10',
  suspend: 'text-purple-400 bg-purple-400/10',
};

export function Logs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.getLogs(100).then(setLogs).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-100">Activity Log</h2>
        <p className="text-sm text-surface-500">VM operations history</p>
      </div>

      <Card>
        {logs.length === 0 ? (
          <div className="p-12 text-center text-surface-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-surface-600" />
            <p>No activity recorded</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {logs.map((log) => (
              <div key={log.id} className="px-4 lg:px-7 py-3 lg:py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className={`text-xs px-2.5 py-1.5 rounded font-medium shrink-0 ${actionColors[log.action] || 'text-surface-400 bg-surface-700'}`}>
                    {log.action}
                  </span>
                  <div className="flex-1 min-w-0 sm:flex-none">
                    <p className="text-sm text-surface-200 truncate">{log.vm_name || `VM ${log.vm_id}`}</p>
                    <p className="text-xs text-surface-500">{log.hypervisor_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:ml-auto pl-[60px] sm:pl-0">
                  <span className={`text-xs ${log.status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {log.status}
                  </span>
                  <span className="text-xs text-surface-500">
                    {new Date(log.created_at).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
