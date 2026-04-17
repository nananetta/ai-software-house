import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Camera, Settings, LogOut } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useLogoutMutation } from '../../hooks/useAuth';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Snapshots', to: '/snapshots', icon: Camera },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        navigate('/login');
      },
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-100">
          <span className="text-xl font-bold text-blue-600">Wealth+</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-4">
          {user && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            disabled={logout.isPending}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {logout.isPending ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
