const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const progressController = require('../controllers/progressController');
const { exerciseProgressRules, checkinWeeksRules } = require('../validators/progressValidators');

const router = express.Router();

router.use(requireAuth);

// Data for the charts on the Progress page
router.get('/exercises', progressController.exercises);
router.get('/exercises/:exerciseId', exerciseProgressRules, progressController.exerciseProgress);
router.get('/checkins', checkinWeeksRules, progressController.checkinWeeks);

module.exports = router;
