const CheckIn = require('../models/CheckIn');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const Workout = require('../models/Workout');
const AppError = require('../utils/AppError');
const { addDays, localDateIn, startOfWeek, weeklyCounts } = require('../utils/checkinDays');
const { heaviestPerSession, loggedExercises } = require('../utils/progress');

const WEEKS_SHOWN = 8;

// Every query is limited to `user: userId`: charts only ever show your own data.

async function listLoggedExercises(userId) {
  const workouts = await Workout.find({ user: userId })
    .select('entries.exercise')
    .populate({ path: 'entries.exercise', select: 'name' })
    .lean();
  return loggedExercises(workouts);
}

async function getExerciseProgress(userId, exerciseId) {
  const exercise = await Exercise.findById(exerciseId).select('name').lean();
  if (!exercise) {
    throw new AppError(404, 'Exercise not found');
  }

  const workouts = await Workout.find({ user: userId, 'entries.exercise': exerciseId })
    .select('date entries')
    .lean();

  return {
    exercise: { _id: String(exercise._id), name: exercise.name },
    points: heaviestPerSession(workouts, exerciseId),
  };
}

async function getCheckinWeeks(userId, timeZone, now = new Date()) {
  const user = await User.findById(userId).select('weeklyGoal');
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const today = localDateIn(now, timeZone);
  const oldestWeekStart = addDays(startOfWeek(today), -7 * (WEEKS_SHOWN - 1));
  const dates = await CheckIn.distinct('localDate', {
    user: userId,
    verified: true,
    localDate: { $gte: oldestWeekStart },
  });

  return { weeklyGoal: user.weeklyGoal, weeks: weeklyCounts(dates, today, WEEKS_SHOWN) };
}

module.exports = { listLoggedExercises, getExerciseProgress, getCheckinWeeks };
