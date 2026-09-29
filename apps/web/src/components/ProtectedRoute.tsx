import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/**
 * Guards nested routes behind authentication. Reads `token` from the auth
 * store (Zustand, persisted to localStorage) rather than any server round
 * trip — sufficient for MVP route gating since every API call still carries
 * its own JWT validation server-side.
 */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
