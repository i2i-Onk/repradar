const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

function createToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function signup({ name, email, password, goal, equipment }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash, goal, equipment });

  return { user, token: createToken(user.id) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message whether the email or the password is wrong, so attackers
  // can't use this endpoint to discover which emails are registered.
  const isValid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!isValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  return { user, token: createToken(user.id) };
}

module.exports = { signup, login };