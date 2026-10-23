const { matchedData } = require('express-validator');
const checkinService = require('../services/checkinService');

async function create(req, res) {
  const result = await checkinService.createCheckIn(req.userId, req.body);
  res.status(201).json(result);
}

async function summary(req, res) {
  // matchedData: validated query values (see exerciseController for why)
  const { timeZone } = matchedData(req, { locations: ['query'] });
  const result = await checkinService.getSummary(req.userId, timeZone);
  res.status(200).json(result);
}

module.exports = { create, summary };
