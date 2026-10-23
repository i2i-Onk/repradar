const userService = require('../services/userService');

async function getMe(req, res) {
  const user = await userService.getUserById(req.userId);
  res.status(200).json({ user });
}

async function updateMe(req, res) {
  const user = await userService.updateUser(req.userId, req.body);
  res.status(200).json({ user });
}

module.exports = { getMe, updateMe };
