const { param, query } = require('express-validator');
const handleValidation = require('../middleware/handleValidation');
const { isValidTimeZone } = require('../utils/checkinDays');

const exerciseProgressRules = [
  param('exerciseId').isMongoId().withMessage('Invalid exercise id'),
  handleValidation,
];

const checkinWeeksRules = [
  query('timeZone')
    .custom(isValidTimeZone)
    .withMessage('A valid time zone is required, e.g. America/Vancouver'),
  handleValidation,
];

module.exports = { exerciseProgressRules, checkinWeeksRules };
