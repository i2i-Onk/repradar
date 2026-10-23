import { Link, NavLink } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        RepRadar
      </Link>

      {/* NavLink adds the "active" class to the link for the current page */}
      <nav className="navbar-links">
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/workouts/new">Log workout</NavLink>
        <NavLink to="/workouts" end>
          History
        </NavLink>
        <NavLink to="/checkin">Check in</NavLink>
        <NavLink to="/progress">Progress</NavLink>
        <NavLink to="/exercises">Exercises</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>

      <div className="navbar-user">
        <span>{user.name}</span>
        {/* Clearing the token makes ProtectedRoute redirect to /login */}
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
