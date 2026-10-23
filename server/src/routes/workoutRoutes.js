const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const workoutController = require('../controllers/workoutController');
const {
  listWorkoutsRules,
  createWorkoutRules,
  updateWorkoutRules,
  workoutIdRules,
} = require('../validators/workoutValidators');

const router = express.Router();

// Every workout route needs a logged-in user
router.use(requireAuth);

router.get('/', listWorkoutsRules, workoutController.list);
router.post('/', createWorkoutRules, workoutController.create);
router.get('/:id', workoutIdRules, workoutController.get);
router.put('/:id', updateWorkoutRules, workoutController.update);
router.delete('/:id', workoutIdRules, workoutController.remove);

module.exports = router;
