const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const exerciseController = require('../controllers/exerciseController');
const { listExercisesRules } = require('../validators/exerciseValidators');

const router = express.Router();

router.get('/', requireAuth, listExercisesRules, exerciseController.list);

module.exports = router;
