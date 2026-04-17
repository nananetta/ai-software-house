import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AppShell } from './AppShell';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthResolved = useAuthStore((s) => s.isAuthResolved);

  if (!isAuthResolved) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
