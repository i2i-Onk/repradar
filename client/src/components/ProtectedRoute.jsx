import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

// Wraps pages that need a logged-in user. While the saved token is still
// being checked ('loading') we wait, otherwise every page refresh would
// bounce a logged-in user to /login.
export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="page">Loading...</p>;
  }

  if (status === 'guest') {
    // Remember where they were going so login can send them back there
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
