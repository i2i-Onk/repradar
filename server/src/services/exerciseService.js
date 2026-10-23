const Exercise = require('../models/Exercise');

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

module.exports = { upsertExercises };
