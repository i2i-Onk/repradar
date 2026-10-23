const express = require('express');
const authController = require('../controllers/authController');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiters');
const { signupRules, loginRules } = require('../validators/authValidators');

const router = express.Router();

// Rate limiters run first, so blocked requests never reach validation or the database
router.post('/signup', signupLimiter, signupRules, authController.signup);
router.post('/login', loginLimiter, loginRules, authController.login);

module.exports = router;
