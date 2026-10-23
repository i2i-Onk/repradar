const { body } = require('express-validator');
const { GOALS, EQUIPMENT } = require('../config/constants');
const handleValidation = require('../middleware/handleValidation');

// Every field is optional: the client only sends what it wants to change
const updateMeRules = [
  body('goal')
    .optional()
    .isIn(GOALS)
    .withMessage(`Goal must be one of: ${GOALS.join(', ')}`),
  body('equipment').optional().isArray().withMessage('Equipment must be a list'),
  body('equipment.*').isIn(EQUIPMENT).withMessage('Unknown equipment type'),
  body('weeklyGoal')
    .optional()
    .isInt({ min: 1, max: 7 })
    .withMessage('Weekly goal must be between 1 and 7 days')
    .toInt(),
  body('gymLocation').optional().isObject().withMessage('Gym location must have lat and lng'),
  body('gymLocation.lat')
    .if(body('gymLocation').exists())
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  body('gymLocation.lng')
    .if(body('gymLocation').exists())
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  handleValidation,
];

module.exports = { updateMeRules };
