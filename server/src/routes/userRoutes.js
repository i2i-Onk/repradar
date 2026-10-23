const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const userController = require('../controllers/userController');
const { updateMeRules } = require('../validators/userValidators');

const router = express.Router();

router.get('/me', requireAuth, userController.getMe);
router.patch('/me', requireAuth, updateMeRules, userController.updateMe);

module.exports = router;
