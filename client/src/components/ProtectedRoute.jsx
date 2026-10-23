import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roleHomes } from '../utils';

export default function ProtectedRoute({ roles }) {
  const { user, checking } = useAuth();
  if (checking) return <div className="page-loader">Checking your session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHomes[user.role] || '/'} replace />;
  return <Outlet />;
}
