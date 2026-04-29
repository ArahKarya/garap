import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

interface Props {
  children: React.ReactNode;
  permission?: string;
  role?: string;
}

export function ProtectedRoute({ children, permission, role }: Props) {
  const location = useLocation();
  const { user, hasPermission, hasRole } = useAuthStore();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />;
  if (role && !hasRole(role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
