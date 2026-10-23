// Rule-based exercise suggestions for the muscle groups that most need training.
// Pure function: takes recovery rows and candidate exercises, never the database.

const { REP_RANGES } = require('../config/constants');
const { sortByMostNeglected } = require('./recovery');

const GROUP_COUNT = 3; // how many muscle groups to suggest
const EXERCISES_PER_GROUP = 3;

// The library includes stretches, which aren't training for a neglected muscle
const STRETCH = /stretch/i;

// Focused exercises (fewer muscle groups) first, then alphabetical, so the
// suggestions for the same data are always the same
function byFocusThenName(a, b) {
  return a.muscleGroups.length - b.muscleGroups.length || a.name.localeCompare(b.name);
}

// wger has several entries for the same exercise, e.g. "Alternating bicep curls"
// and "Alternating Biceps Curls With Dumbbell". Compare names as sets of words,
// ignoring plurals, equipment words and filler words.
const IGNORED_WORDS = new Set([
  'a', 'and', 'on', 'the', 'using', 'with',
  'band', 'barbell', 'bodyweight', 'cable', 'dumbbell', 'kettlebell', 'machine',
]); // prettier-ignore
const SIMILAR_SHARE = 2 / 3;

function nameWords(name) {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/s$/, ''))
    .filter((word) => word && !IGNORED_WORDS.has(word));
  return new Set(words);
}

// Same equipment, and most words of the shorter name appear in the other
function isNearDuplicate(a, b) {
  if (a.equipment !== b.equipment) return false;
  const wordsA = nameWords(a.name);
  const wordsB = nameWords(b.name);
  const shorter = Math.min(wordsA.size, wordsB.size);
  if (shorter === 0) return false;
  const shared = [...wordsA].filter((word) => wordsB.has(word)).length;
  return shared / shorter >= SIMILAR_SHARE;
}

function pickVaried(candidates, count) {
  const picks = [];
  for (const candidate of candidates) {
    if (picks.length === count) break;
    if (!picks.some((pick) => isNearDuplicate(pick, candidate))) picks.push(candidate);
  }
  return picks;
}

// recovery: rows from calculateRecovery. exercises: candidates from the library.
// equipment: what the user has. goal: 'strength' | 'hypertrophy' | 'general'.
// Returns { repRange: { min, max }, groups: [{ muscleGroup, daysSince, status, exercises }] }
function recommendExercises({ recovery, exercises, equipment, goal }) {
  const usable = exercises
    .filter((exercise) => equipment.includes(exercise.equipment))
    .filter((exercise) => !STRETCH.test(exercise.name));
  const used = new Set(); // don't suggest the same exercise for two groups
  const groups = [];

  for (const row of sortByMostNeglected(recovery)) {
    if (groups.length === GROUP_COUNT) break;
    // Trained in the last couple of days: still recovering, so don't push it
    if (row.status === 'recent') continue;

    const candidates = usable
      .filter((exercise) => exercise.muscleGroups.includes(row.muscleGroup))
      .filter((exercise) => !used.has(String(exercise._id)))
      .sort(byFocusThenName);
    const picks = pickVaried(candidates, EXERCISES_PER_GROUP);

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
