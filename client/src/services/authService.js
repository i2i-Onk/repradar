import { apiRequest } from './api';

export function signup(details) {
  return apiRequest('/api/auth/signup', { method: 'POST', body: details });
}

export function login(credentials) {
  return apiRequest('/api/auth/login', { method: 'POST', body: credentials });
}

export function getMe(token) {
  return apiRequest('/api/users/me', { token });
}
