const { body, query } = require('express-validator');
const handleValidation = require('../middleware/handleValidation');
const { isValidTimeZone } = require('../utils/checkinDays');

const TIME_ZONE_MESSAGE = 'A valid time zone is required, e.g. America/Vancouver';

// POST /api/checkins { lat, lng, timeZone }
const createCheckInRules = [
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  body('timeZone').custom(isValidTimeZone).withMessage(TIME_ZONE_MESSAGE),
  handleValidation,
];

// GET /api/checkins/summary?timeZone=
const summaryRules = [
  query('timeZone').custom(isValidTimeZone).withMessage(TIME_ZONE_MESSAGE),
  handleValidation,
];

module.exports = { createCheckInRules, summaryRules };
