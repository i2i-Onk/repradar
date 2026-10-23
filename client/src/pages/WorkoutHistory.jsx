import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { deleteWorkout, listWorkouts } from '../services/workoutService';
import { formatWorkoutDate } from '../utils/dates';

// "8 × 60 kg", or "12 reps" for bodyweight sets
function formatSet({ reps, weight }) {
  return weight > 0 ? `${reps} × ${weight} kg` : `${reps} reps`;
}

export default function WorkoutHistory() {
  const { token } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, workouts: [], error: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let ignore = false;
    listWorkouts(token)
      .then(({ workouts }) => {
        if (!ignore) setState({ loading: false, workouts, error: '' });
      })
      .catch((error) => {
        if (!ignore) setState({ loading: false, workouts: [], error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  async function handleDelete(workout) {
    const confirmed = window.confirm(
      `Delete your workout from ${formatWorkoutDate(workout.date)}? This can't be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(workout._id);
    setDeleteError('');
    try {
      await deleteWorkout(token, workout._id);
      setState((current) => ({
        ...current,
        workouts: current.workouts.filter((w) => w._id !== workout._id),
      }));
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Workout history</h1>
        <Link to="/workouts/new">+ Log workout</Link>
      </div>

      <div aria-live="polite">
        {location.state?.message && <p className="form-success">{location.state.message}</p>}
        {deleteError && <p className="form-error">{deleteError}</p>}
        {state.loading && <p>Loading...</p>}
        {state.error && <p className="form-error">{state.error}</p>}
        {!state.loading && !state.error && state.workouts.length === 0 && (
          <p>
            No workouts yet. <Link to="/workouts/new">Log your first one</Link>.
          </p>
        )}
      </div>

      <ul className="workout-list">
        {state.workouts.map((workout) => (
          <li key={workout._id} className="workout-card">
            <h2>{formatWorkoutDate(workout.date)}</h2>
            <ul className="workout-entries">
              {workout.entries.map((entry, i) => (
                <li key={i}>
                  <strong>{entry.exercise?.name ?? 'Exercise no longer in the library'}</strong>
                  <span>: {entry.sets.map(formatSet).join(', ')}</span>
                </li>
              ))}
            </ul>
            <div className="entry-actions">
              <Link to={`/workouts/${workout._id}/edit`}>Edit</Link>
              <button
                type="button"
                onClick={() => handleDelete(workout)}
                disabled={deletingId === workout._id}
              >
                {deletingId === workout._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
