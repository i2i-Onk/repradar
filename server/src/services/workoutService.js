const Exercise = require('../models/Exercise');
const Workout = require('../models/Workout');
const AppError = require('../utils/AppError');

const DEFAULT_LIMIT = 50;

// Fill in each entry's exercise with the details the pages show
const WITH_EXERCISES = { path: 'entries.exercise', select: 'name muscleGroups equipment' };

// Every query below includes `user: userId`, so a user can only ever find,
// change or delete their own workouts. Someone else's workout gets the same
// 404 as one that doesn't exist, so ids of other users' workouts aren't revealed.

// Copy only the named fields, never the request body as a whole
function toEntries(entries) {
  return entries.map(({ exercise, sets }) => ({
    exercise,
    sets: sets.map(({ reps, weight }) => ({ reps, weight: weight ?? 0 })),
  }));
}

async function checkExercisesExist(entries) {
  const ids = [...new Set(entries.map((entry) => String(entry.exercise)))];
  const found = await Exercise.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw new AppError(400, 'One or more exercises are not in the exercise library');
  }
}

async function listWorkouts(userId, { limit = DEFAULT_LIMIT } = {}) {
  return Workout.find({ user: userId })
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .populate(WITH_EXERCISES);
}

async function getWorkout(userId, workoutId) {
  const workout = await Workout.findOne({ _id: workoutId, user: userId }).populate(WITH_EXERCISES);
  if (!workout) {
    throw new AppError(404, 'Workout not found');
  }
  return workout;
}

async function createWorkout(userId, { date, entries }) {
  await checkExercisesExist(entries);
  const workout = await Workout.create({
    user: userId,
    date: date ?? new Date(),
    entries: toEntries(entries),
  });
  return workout.populate(WITH_EXERCISES);
}

async function updateWorkout(userId, workoutId, { date, entries }) {
  await checkExercisesExist(entries);
  const changes = { entries: toEntries(entries) };
  if (date !== undefined) changes.date = date;

  const workout = await Workout.findOneAndUpdate({ _id: workoutId, user: userId }, changes, {
    new: true,
    runValidators: true,
  }).populate(WITH_EXERCISES);
  if (!workout) {
    throw new AppError(404, 'Workout not found');
  }
  return workout;
}

async function deleteWorkout(userId, workoutId) {
  const deleted = await Workout.findOneAndDelete({ _id: workoutId, user: userId });
  if (!deleted) {
    throw new AppError(404, 'Workout not found');
  }
}

module.exports = { listWorkouts, getWorkout, createWorkout, updateWorkout, deleteWorkout };
