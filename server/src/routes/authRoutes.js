const express = require('express');
const authController = require('../controllers/authController');
const { signupRules, loginRules } = require('../validators/authValidators');

const router = express.Router();

router.post('/signup', signupRules, authController.signup);
router.post('/login', loginRules, authController.login);

module.exports = router;