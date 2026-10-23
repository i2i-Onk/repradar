const GOALS = ['strength', 'hypertrophy', 'general'];

const EQUIPMENT = ['bodyweight', 'dumbbell', 'barbell', 'kettlebell', 'machine', 'cable', 'band'];

const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

// Recovery colours on the dashboard: up to recentMaxDays is "recent",
// up to dueMaxDays is "due", anything longer (or never trained) is "neglected"
const RECOVERY_THRESHOLDS = { recentMaxDays: 2, dueMaxDays: 5 };

// Suggested reps per set for each training goal
const REP_RANGES = {
  strength: { min: 3, max: 6 },
  hypertrophy: { min: 8, max: 12 },
  general: { min: 10, max: 15 },
};

module.exports = { GOALS, EQUIPMENT, MUSCLE_GROUPS, RECOVERY_THRESHOLDS, REP_RANGES };
