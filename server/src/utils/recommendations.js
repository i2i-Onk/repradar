// Rule-based exercise suggestions for the muscle groups that most need training.
// Pure function: takes recovery rows and candidate exercises, never the database.

const { REP_RANGES } = require('../config/constants');
const { sortByMostNeglected } = require('./recovery');

const GROUP_COUNT = 3; // how many muscle groups to suggest
const EXERCISES_PER_GROUP = 3;

// Focused exercises (fewer muscle groups) first, then alphabetical, so the
// suggestions for the same data are always the same
function byFocusThenName(a, b) {
  return a.muscleGroups.length - b.muscleGroups.length || a.name.localeCompare(b.name);
}

// recovery: rows from calculateRecovery. exercises: candidates from the library.
// equipment: what the user has. goal: 'strength' | 'hypertrophy' | 'general'.
// Returns { repRange: { min, max }, groups: [{ muscleGroup, daysSince, status, exercises }] }
function recommendExercises({ recovery, exercises, equipment, goal }) {
  const usable = exercises.filter((exercise) => equipment.includes(exercise.equipment));
  const used = new Set(); // don't suggest the same exercise for two groups
  const groups = [];

  for (const row of sortByMostNeglected(recovery)) {
    if (groups.length === GROUP_COUNT) break;
    // Trained in the last couple of days: still recovering, so don't push it
    if (row.status === 'recent') continue;

    const picks = usable
      .filter((exercise) => exercise.muscleGroups.includes(row.muscleGroup))
      .filter((exercise) => !used.has(String(exercise._id)))
      .sort(byFocusThenName)
      .slice(0, EXERCISES_PER_GROUP);

    // Nothing this user can do for this group: move on to the next one
    if (picks.length === 0) continue;

    picks.forEach((exercise) => used.add(String(exercise._id)));
    groups.push({
      muscleGroup: row.muscleGroup,
      daysSince: row.daysSince,
      status: row.status,
      exercises: picks,
    });
  }

  return { repRange: REP_RANGES[goal] ?? REP_RANGES.general, groups };
}

module.exports = { recommendExercises };
