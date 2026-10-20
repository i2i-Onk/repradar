const userService = require('../services/userService');

async function getMe(req, res) {
  const user = await userService.getUserById(req.userId);
  res.status(200).json({ user });
}

module.exports = { getMe };