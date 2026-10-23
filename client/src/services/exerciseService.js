import { apiRequest } from './api';

// filters: { search, muscle, equipment }. Empty values are left out of the URL.
export function listExercises(token, filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return apiRequest(`/api/exercises${query ? `?${query}` : ''}`, { token });
}
