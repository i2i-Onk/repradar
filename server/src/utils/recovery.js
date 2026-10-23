// Works out how long ago each muscle group was trained. Pure functions:
// they take workouts and a "now", and never touch the database.

const { MUSCLE_GROUPS, RECOVERY_THRESHOLDS } = require('../config/constants');

const DAY_MS = 24 * 60 * 60 * 1000;

// Workouts are saved at 12:00 local time on the chosen day (see client utils/dates.js).
// So at any moment during day D + k, the time since that noon is between k - 0.5
// and k + 0.5 days, and rounding gives exactly k: the calendar-day difference in
// the user's own time zone, without the server needing to know which zone it is.
function daysBetween(earlier, now) {
  return Math.max(0, Math.round((now.getTime() - earlier.getTime()) / DAY_MS));
}

// 'recent' | 'due' | 'neglected'. Never trained (null) counts as neglected.
function recoveryStatus(daysSince) {
  if (daysSince === null) return 'neglected';
  if (daysSince <= RECOVERY_THRESHOLDS.recentMaxDays) return 'recent';
  if (daysSince <= RECOVERY_THRESHOLDS.dueMaxDays) return 'due';
  return 'neglected';
}

// workouts: [{ date, entries: [{ exercise: { muscleGroups } }] }], exercises filled in.
// Returns one row per muscle group, in MUSCLE_GROUPS order:
// { muscleGroup, lastTrained (Date or null), daysSince (number or null), status }
function calculateRecovery(workouts, now = new Date()) {
  const lastTrained = new Map(MUSCLE_GROUPS.map((group) => [group, null]));

  for (const workout of workouts) {
    const date = new Date(workout.date);
    for (const entry of workout.entries) {
      // exercise is null if it was removed from the library after the workout was logged
      for (const group of entry.exercise?.muscleGroups ?? []) {
        if (!lastTrained.has(group)) continue;
        const previous = lastTrained.get(group);
        if (!previous || date > previous) lastTrained.set(group, date);
      }
    }
  }

  return MUSCLE_GROUPS.map((muscleGroup) => {
    const date = lastTrained.get(muscleGroup);
    const daysSince = date ? daysBetween(date, now) : null;
    return { muscleGroup, lastTrained: date, daysSince, status: recoveryStatus(daysSince) };
  });
}

// Most neglected first: never-trained groups, then the longest since training.
// Ties keep their MUSCLE_GROUPS order. Returns a new list.
function sortByMostNeglected(recovery) {
  // A large finite number, not Infinity: Infinity - Infinity is NaN, which sort only
  // treats as "equal" by accident
  const neglect = (row) => (row.daysSince === null ? Number.MAX_SAFE_INTEGER : row.daysSince);
  return [...recovery].sort((a, b) => neglect(b) - neglect(a));
}

module.exports = { calculateRecovery, recoveryStatus, sortByMostNeglected };
