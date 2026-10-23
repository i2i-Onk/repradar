// Calendar-day maths for check-ins: streaks and weekly progress.
// Pure functions that work on local dates as "YYYY-MM-DD" strings.
//
// Time zones: a "day" means the user's own calendar day. The browser sends its
// time zone (e.g. "America/Vancouver") and each check-in stores the local date
// it happened on (localDateIn). After that, everything here is plain calendar
// arithmetic with no clocks involved, so daylight saving can't shift a day.

const DAY_MS = 24 * 60 * 60 * 1000;

function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// The "YYYY-MM-DD" date of `moment` in `timeZone`
function localDateIn(moment, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(moment);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Calendar dates are handled as midnight UTC internally, purely for arithmetic
function toUtcMidnight(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

const fromUtcMidnight = (ms) => new Date(ms).toISOString().slice(0, 10);

function addDays(date, days) {
  return fromUtcMidnight(toUtcMidnight(date) + days * DAY_MS);
}

// Weeks run Monday to Sunday
function startOfWeek(date) {
  const dayOfWeek = new Date(toUtcMidnight(date)).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return addDays(date, -daysSinceMonday);
}

// Consecutive days with a verified check-in, ending today. If there's no
// check-in yet today, a streak that reached yesterday still counts: the user
// has until the end of today to keep it going.
function calculateStreak(dates, today) {
  const days = new Set(dates);
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

// Days with a verified check-in this week (Monday to Sunday) against the goal
function weeklyProgress(dates, today, goal) {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  // "YYYY-MM-DD" strings sort the same way as the dates they stand for
  const count = new Set(dates.filter((date) => date >= weekStart && date <= weekEnd)).size;
  return { weekStart, weekEnd, count, goal, remaining: Math.max(0, goal - count) };
}

module.exports = {
  addDays,
  calculateStreak,
  isValidTimeZone,
  localDateIn,
  startOfWeek,
  weeklyProgress,
};
