const { validationResult } = require('express-validator');

// Runs after validation rules. If any rule failed, responds with 400
// and a list of problems, and the request never reaches the controller.
function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }

  next();
}

module.exports = handleValidation;