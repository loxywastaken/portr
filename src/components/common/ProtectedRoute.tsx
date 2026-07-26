import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageLoader } from './FullPageLoader';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
