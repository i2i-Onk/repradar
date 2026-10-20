const authService = require('../services/authService');

async function signup(req, res) {
  const { user, token } = await authService.signup(req.body);
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const { user, token } = await authService.login(req.body);
  res.status(200).json({ user, token });
}

module.exports = { signup, login };