import { useNavigate } from 'react-router';
import WorkoutForm from '../components/WorkoutForm';
import { useAuth } from '../hooks/useAuth';
import { createWorkout } from '../services/workoutService';

export default function LogWorkout() {
  const { token } = useAuth();
  const navigate = useNavigate();

  async function save(workout) {
    await createWorkout(token, workout);
    navigate('/workouts', { state: { message: 'Workout saved.' } });
  }

  return (
    <main className="page">
      <h1>Log a workout</h1>
      <WorkoutForm onSubmit={save} submitLabel="Save workout" />
    </main>
  );
}
