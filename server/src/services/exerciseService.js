const Exercise = require('../models/Exercise');

const DEFAULT_LIMIT = 50;

// Makes characters like ( . * match themselves instead of acting as regex
// syntax, so user search text can't break or slow down the query
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function listExercises({ search, muscle, equipment, limit = DEFAULT_LIMIT }) {
  const filter = {};
  if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
  if (muscle) filter.muscleGroups = muscle; // matches if the list contains it
  if (equipment) filter.equipment = equipment;

  const [exercises, total] = await Promise.all([
    Exercise.find(filter).sort({ name: 1 }).limit(limit),
    Exercise.countDocuments(filter),
  ]);

  return { exercises, total };
}

// Saves exercises imported from wger. Safe to run again and again: each
// exercise is matched by its wgerId and updated if it exists, inserted if not.
// Exercises not in the list are never touched or deleted.
async function upsertExercises(exercises) {
  // Make sure the unique wgerId index exists before writing, as a backstop
  // against duplicates
  await Exercise.init();

  // timestamps: false stops Mongoose adding a new updatedAt to every update,
  // which made each re-run count every exercise as "updated" even when
  // nothing had changed. Instead the dates are set once, on first import.
  const now = new Date();
  const operations = exercises.map((exercise) => ({
    updateOne: {
      filter: { wgerId: exercise.wgerId },
      update: { $set: exercise, $setOnInsert: { createdAt: now, updatedAt: now } },
      upsert: true,
      timestamps: false,
    },
  }));

  const result = await Exercise.bulkWrite(operations);

  return {
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    unchanged: result.matchedCount - result.modifiedCount,
  };
}

module.exports = { listExercises, upsertExercises };
