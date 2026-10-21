import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth';

// Wraps login and signup: a user who is already logged in goes to the dashboard
export default function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <p className="page">Loading...</p>;
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
