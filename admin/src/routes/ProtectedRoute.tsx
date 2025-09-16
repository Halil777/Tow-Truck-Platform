import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

