const { matchedData } = require('express-validator');
const exerciseService = require('../services/exerciseService');

async function list(req, res) {
  // matchedData gives the validated, cleaned-up query values (e.g. limit as a
  // number). In Express 5, req.query is re-read from the URL each time, so
  // express-validator's clean-ups don't stick to it.
  const filters = matchedData(req, { locations: ['query'] });
  const { exercises, total } = await exerciseService.listExercises(filters);
  res.status(200).json({ exercises, total });
}

module.exports = { list };
