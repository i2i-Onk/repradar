const User = require('../models/User');
const AppError = require('../utils/AppError');

async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

// Only these fields can be changed from the settings page. Anything else
// in the request (email, passwordHash, _id...) is ignored.
const UPDATABLE_FIELDS = ['goal', 'equipment', 'weeklyGoal', 'gymLocation'];

async function updateUser(userId, input) {
  const changes = {};
  for (const field of UPDATABLE_FIELDS) {
    if (input[field] !== undefined) {
      changes[field] = input[field];
    }
  }

  // new: return the updated user; runValidators: re-check the schema rules
  const user = await User.findByIdAndUpdate(userId, changes, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

module.exports = { getUserById, updateUser };
