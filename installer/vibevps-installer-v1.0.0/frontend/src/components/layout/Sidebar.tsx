import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  PlusCircle,
  Server,
  FileBox,
  Settings,
  LogOut,
  Activity,
  Download,
} from 'lucide-react';
import { useAuth } from '../../store/auth';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vms', icon: Monitor, label: 'Virtual Machines' },
  { to: '/create', icon: PlusCircle, label: 'Crea VM' },
  { to: '/templates', icon: FileBox, label: 'Templates' },
  { to: '/hypervisors', icon: Server, label: 'Hypervisors' },
  { to: '/logs', icon: Activity, label: 'Log Attivita' },
  { to: '/settings', icon: Settings, label: 'Impostazioni' },
  { to: '/updates', icon: Download, label: 'Aggiornamenti' },
];

export function Sidebar() {
  const logout = useAuth((s) => s.logout);

  return (
    <aside className="w-64 bg-surface-900 border-r border-surface-700 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-surface-700">
        <h1 className="text-xl font-bold">
          <span className="text-primary-400">VIBE</span>
          <span className="text-surface-200">Vps</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">Virtual Machine Manager</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-surface-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-400 hover:text-red-400 hover:bg-surface-800 w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
