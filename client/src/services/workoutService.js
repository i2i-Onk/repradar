import { apiRequest } from './api';

export function listWorkouts(token) {
  return apiRequest('/api/workouts', { token });
}

export function getWorkout(token, id) {
  return apiRequest(`/api/workouts/${id}`, { token });
}

// workout: { date, entries: [{ exercise: id, sets: [{ reps, weight }] }] }
export function createWorkout(token, workout) {
  return apiRequest('/api/workouts', { method: 'POST', body: workout, token });
}

export function updateWorkout(token, id, workout) {
  return apiRequest(`/api/workouts/${id}`, { method: 'PUT', body: workout, token });
}

export function deleteWorkout(token, id) {
  return apiRequest(`/api/workouts/${id}`, { method: 'DELETE', token });
}
