import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import WorkoutForm from '../components/WorkoutForm';
import { useAuth } from '../hooks/useAuth';
import { getWorkout, updateWorkout } from '../services/workoutService';

export default function EditWorkout() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  // Remembers which workout id was loaded, so changing id shows "Loading..." again
  const [loaded, setLoaded] = useState({ id: null, workout: null, error: '' });
  const loading = loaded.id !== id;

  useEffect(() => {
    let ignore = false;
    getWorkout(token, id)
      .then(({ workout }) => {
        if (!ignore) setLoaded({ id, workout, error: '' });
      })
      .catch((error) => {
        if (!ignore) setLoaded({ id, workout: null, error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [token, id]);

  async function save(changes) {
    await updateWorkout(token, id, changes);
    navigate('/workouts', { state: { message: 'Workout updated.' } });
  }

  return (
    <main className="page">
      <h1>Edit workout</h1>
      {loading && <p>Loading...</p>}
      {!loading && loaded.error && (
        <p className="form-error">
          {loaded.error}. <Link to="/workouts">Back to history</Link>
        </p>
      )}
      {!loading && loaded.workout && (
        <WorkoutForm
          key={loaded.workout._id}
          initialWorkout={loaded.workout}
          onSubmit={save}
          submitLabel="Save changes"
        />
      )}
    </main>
  );
}
