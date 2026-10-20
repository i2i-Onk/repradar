const { body } = require('express-validator');
const { GOALS, EQUIPMENT } = require('../config/constants');
const handleValidation = require('../middleware/handleValidation');

const signupRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('goal').optional().isIn(GOALS).withMessage(`Goal must be one of: ${GOALS.join(', ')}`),
  body('equipment').optional().isArray().withMessage('Equipment must be a list'),
  body('equipment.*').isIn(EQUIPMENT).withMessage('Unknown equipment type'),
  handleValidation,
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').toLowerCase(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation,
];

module.exports = { signupRules, loginRules };