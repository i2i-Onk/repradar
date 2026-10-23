const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const checkinController = require('../controllers/checkinController');
const { createCheckInRules, summaryRules } = require('../validators/checkinValidators');

const router = express.Router();

router.use(requireAuth);

router.post('/', createCheckInRules, checkinController.create);
router.get('/summary', summaryRules, checkinController.summary);

module.exports = router;
