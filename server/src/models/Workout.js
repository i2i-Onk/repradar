const mongoose = require('mongoose');

// Limits shared with validators/workoutValidators.js
const LIMITS = {
  maxEntries: 30, // exercises per workout
  maxSets: 20, // sets per exercise
  maxReps: 1000,
  maxWeight: 1000, // kg
};

const setSchema = new mongoose.Schema(
  {
    reps: { type: Number, required: true, min: 1, max: LIMITS.maxReps },
    // 0 is allowed for bodyweight exercises
    weight: { type: Number, min: 0, max: LIMITS.maxWeight, default: 0 },
  },
  { _id: false },
);

const entrySchema = new mongoose.Schema(
  {
    exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    sets: {
      type: [setSchema],
      validate: {
        validator: (sets) => sets.length >= 1 && sets.length <= LIMITS.maxSets,
        message: `Each exercise needs between 1 and ${LIMITS.maxSets} sets`,
      },
    },
  },
  { _id: false },
);

const workoutSchema = new mongoose.Schema(
  {
    // Who logged it. Every query filters on this so users only see their own workouts.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    entries: {
      type: [entrySchema],
      validate: {
        validator: (entries) => entries.length >= 1 && entries.length <= LIMITS.maxEntries,
        message: `A workout needs between 1 and ${LIMITS.maxEntries} exercises`,
      },
    },
  },
  { timestamps: true },
);

// History lists a user's workouts newest first
workoutSchema.index({ user: 1, date: -1 });

workoutSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Workout = mongoose.model('Workout', workoutSchema);

module.exports = Workout;
module.exports.LIMITS = LIMITS;
