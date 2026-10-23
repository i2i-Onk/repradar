import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

// Wraps login and signup. Once the user is logged in, send them to the page
// ProtectedRoute bounced them from (if any), otherwise the dashboard.
export default function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <p className="page">Loading...</p>;
  }

  if (status === 'authenticated') {
    const destination = location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
