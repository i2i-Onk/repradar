import { apiRequest } from './api';
import { currentTimeZone } from '../utils/dates';

// [{ _id, name, sessions }]: only exercises this user has logged
export function listLoggedExercises(token) {
  return apiRequest('/api/progress/exercises', { token });
}

// { exercise: { _id, name }, points: [{ workoutId, date, weight, reps }] }
export function getExerciseProgress(token, exerciseId) {
  return apiRequest(`/api/progress/exercises/${exerciseId}`, { token });
}

// { weeklyGoal, weeks: [{ weekStart, count }] } for the last 8 weeks
export function getCheckinWeeks(token) {
  const timeZone = encodeURIComponent(currentTimeZone());
  return apiRequest(`/api/progress/checkins?timeZone=${timeZone}`, { token });
}
