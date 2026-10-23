import { Route, Routes } from 'react-router';
import GuestRoute from './components/GuestRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import EditWorkout from './pages/EditWorkout';
import Exercises from './pages/Exercises';
import LogWorkout from './pages/LogWorkout';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import WorkoutHistory from './pages/WorkoutHistory';

// Every page in the app and who is allowed to see it
export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/workouts" element={<WorkoutHistory />} />
          <Route path="/workouts/new" element={<LogWorkout />} />
          <Route path="/workouts/:id/edit" element={<EditWorkout />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
