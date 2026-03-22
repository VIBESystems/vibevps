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
  X,
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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const logout = useAuth((s) => s.logout);

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 w-64 bg-surface-900 border-r border-surface-700 flex flex-col h-screen transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-surface-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-primary-400">VIBE</span>
              <span className="text-surface-200">Vps</span>
            </h1>
            <p className="text-xs text-surface-500 mt-1">Virtual Machine Manager</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-surface-700 text-surface-400 hover:text-surface-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
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
    </>
  );
}
