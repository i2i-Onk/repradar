import { apiRequest } from './api';

// Sends only the fields that changed: goal, equipment, weeklyGoal, gymLocation
export function updateMe(token, changes) {
  return apiRequest('/api/users/me', { method: 'PATCH', body: changes, token });
}
