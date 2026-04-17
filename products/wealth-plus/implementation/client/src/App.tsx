import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SnapshotListPage from './pages/SnapshotListPage';
import CreateSnapshotPage from './pages/CreateSnapshotPage';
import SnapshotDetailPage from './pages/SnapshotDetailPage';
import SettingsPage from './pages/SettingsPage';
import AccountPage from './pages/AccountPage';
import { useAuthBootstrap } from './hooks/useAuth';

export default function App() {
  useAuthBootstrap();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/snapshots" element={<SnapshotListPage />} />
        <Route path="/snapshots/new" element={<CreateSnapshotPage />} />
        <Route path="/snapshots/:id" element={<SnapshotDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/account" element={<AccountPage />} />
      </Route>
    </Routes>
  );
}
