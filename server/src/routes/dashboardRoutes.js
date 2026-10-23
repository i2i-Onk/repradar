const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Recovery status and recommendations for the logged-in user
router.get('/', requireAuth, dashboardController.get);

module.exports = router;
