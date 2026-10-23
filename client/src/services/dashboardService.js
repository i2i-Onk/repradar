import { apiRequest } from './api';

// { recovery, recommendations: { repRange, groups }, thresholds, goal }
export function getDashboard(token) {
  return apiRequest('/api/dashboard', { token });
}
