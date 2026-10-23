import { apiRequest } from './api';
import { currentTimeZone } from '../utils/dates';

// The browser's time zone goes with each request, so "today" and "this week"
// mean the user's own days (see server/src/utils/checkinDays.js)

// Returns { checkIn: { verified, distance, ... }, radius, summary }
export function checkIn(token, { lat, lng }) {
  return apiRequest('/api/checkins', {
    method: 'POST',
    body: { lat, lng, timeZone: currentTimeZone() },
    token,
  });
}

// Returns { streak, week: { count, goal, remaining, ... }, todayCheckedIn, hasGymLocation, radius }
export function getCheckinSummary(token) {
  const timeZone = encodeURIComponent(currentTimeZone());
  return apiRequest(`/api/checkins/summary?timeZone=${timeZone}`, { token });
}
