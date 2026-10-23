const { matchedData } = require('express-validator');
const workoutService = require('../services/workoutService');

async function list(req, res) {
  // matchedData: validated query values (see exerciseController for why)
  const options = matchedData(req, { locations: ['query'] });
  const workouts = await workoutService.listWorkouts(req.userId, options);
  res.status(200).json({ workouts });
}

async function get(req, res) {
  const workout = await workoutService.getWorkout(req.userId, req.params.id);
  res.status(200).json({ workout });
}

async function create(req, res) {
  const workout = await workoutService.createWorkout(req.userId, req.body);
  res.status(201).json({ workout });
}

async function update(req, res) {
  const workout = await workoutService.updateWorkout(req.userId, req.params.id, req.body);
  res.status(200).json({ workout });
}

async function remove(req, res) {
  await workoutService.deleteWorkout(req.userId, req.params.id);
  res.status(204).end();
}

module.exports = { list, get, create, update, remove };
