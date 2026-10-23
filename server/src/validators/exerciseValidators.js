const { query } = require('express-validator');
const { EQUIPMENT, MUSCLE_GROUPS } = require('../config/constants');
const handleValidation = require('../middleware/handleValidation');

// GET /api/exercises?search=&muscle=&equipment=&limit= (all optional)
const listExercisesRules = [
  query('search')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Search must be 50 characters or fewer'),
  query('muscle')
    .optional()
    .isIn(MUSCLE_GROUPS)
    .withMessage(`Muscle must be one of: ${MUSCLE_GROUPS.join(', ')}`),
  query('equipment')
    .optional()
    .isIn(EQUIPMENT)
    .withMessage(`Equipment must be one of: ${EQUIPMENT.join(', ')}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidation,
];

module.exports = { listExercisesRules };
