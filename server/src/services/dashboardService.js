const { RECOVERY_THRESHOLDS } = require('../config/constants');
const Exercise = require('../models/Exercise');
const User = require('../models/User');
const Workout = require('../models/Workout');
const AppError = require('../utils/AppError');
const { calculateRecovery } = require('../utils/recovery');
const { recommendExercises } = require('../utils/recommendations');

// Loads what the pure functions in utils/ need, then lets them do the work
async function getDashboard(userId, now = new Date()) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // Only this user's workouts, with just the fields recovery needs
  const workouts = await Workout.find({ user: userId })
    .select('date entries.exercise')
    .populate({ path: 'entries.exercise', select: 'muscleGroups' })
    .lean();
  const recovery = calculateRecovery(workouts, now);

  // Candidate exercises: only for groups that could be suggested, and only
  // with equipment this user has
  const groupsToSuggest = recovery
    .filter((row) => row.status !== 'recent')
    .map((r) => r.muscleGroup);
  const candidates = await Exercise.find({
    muscleGroups: { $in: groupsToSuggest },
    equipment: { $in: user.equipment },
  })
    .select('name muscleGroups equipment')
    .lean();

  const recommendations = recommendExercises({
    recovery,
    exercises: candidates,
    equipment: user.equipment,
    goal: user.goal,
  });

  return { recovery, recommendations, thresholds: RECOVERY_THRESHOLDS, goal: user.goal };
}

module.exports = { getDashboard };
