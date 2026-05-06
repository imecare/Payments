import { useContext, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

interface RoleRouteProps {
  children: ReactNode;
  allow: Array<'super_admin' | 'commissionist'>;
  fallbackTo?: string;
}

export default function RoleRoute({ children, allow, fallbackTo = '/forbidden' }: RoleRouteProps) {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role;
  const isAllowed = role !== 'unknown' && allow.includes(role);
  return isAllowed ? <>{children}</> : <Navigate to={fallbackTo} replace />;
}
