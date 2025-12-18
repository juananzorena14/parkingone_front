import { Navigate } from 'react-router-dom';
import { hasRole } from '@/lib/auth';

export default function Protected({ children, roles }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !hasRole(roles)) return <Navigate to="/forbidden" replace />;
  return children;
}
