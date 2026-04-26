import { useContext, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { user } = useContext(AuthContext);
  return user ? children : <Navigate to="/login" />;
}