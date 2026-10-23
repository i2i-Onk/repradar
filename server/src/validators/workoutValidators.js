const { body, param, query } = require('express-validator');
const handleValidation = require('../middleware/handleValidation');
const { LIMITS } = require('../models/Workout');

// Allow a day of slack so "today" in any time zone is never rejected as future
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

const idRule = param('id').isMongoId().withMessage('Invalid workout id');

// Used for both creating (POST) and editing (PUT) a workout
const workoutBodyRules = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid date')
    .bail()
    .custom((value) => new Date(value).getTime() <= Date.now() + FUTURE_SLACK_MS)
    .withMessage('Date cannot be in the future'),
  body('entries')
    .isArray({ min: 1, max: LIMITS.maxEntries })
    .withMessage(`Add between 1 and ${LIMITS.maxEntries} exercises`),
  body('entries.*.exercise').isMongoId().withMessage('Choose an exercise from the library'),
  body('entries.*.sets')
    .isArray({ min: 1, max: LIMITS.maxSets })
    .withMessage(`Each exercise needs between 1 and ${LIMITS.maxSets} sets`),
  body('entries.*.sets.*.reps')
    .isInt({ min: 1, max: LIMITS.maxReps })
    .withMessage(`Reps must be a whole number from 1 to ${LIMITS.maxReps}`)
    .toInt(),
  body('entries.*.sets.*.weight')
    .optional()
    .isFloat({ min: 0, max: LIMITS.maxWeight })
    .withMessage(`Weight must be from 0 to ${LIMITS.maxWeight} kg`)
    .toFloat(),
];

const listWorkoutsRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidation,
];
const createWorkoutRules = [...workoutBodyRules, handleValidation];
const updateWorkoutRules = [idRule, ...workoutBodyRules, handleValidation];
const workoutIdRules = [idRule, handleValidation];

module.exports = { listWorkoutsRules, createWorkoutRules, updateWorkoutRules, workoutIdRules };
