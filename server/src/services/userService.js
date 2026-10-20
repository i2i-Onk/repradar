const User = require('../models/User');
const AppError = require('../utils/AppError');

async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return user;
}

module.exports = { getUserById };