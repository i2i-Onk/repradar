const { matchedData } = require('express-validator');
const progressService = require('../services/progressService');

async function exercises(req, res) {
  const list = await progressService.listLoggedExercises(req.userId);
  res.status(200).json({ exercises: list });
}

async function exerciseProgress(req, res) {
  const result = await progressService.getExerciseProgress(req.userId, req.params.exerciseId);
  res.status(200).json(result);
}

async function checkinWeeks(req, res) {
  // matchedData: validated query values (see exerciseController for why)
  const { timeZone } = matchedData(req, { locations: ['query'] });
  const result = await progressService.getCheckinWeeks(req.userId, timeZone);
  res.status(200).json(result);
}

module.exports = { exercises, exerciseProgress, checkinWeeks };
