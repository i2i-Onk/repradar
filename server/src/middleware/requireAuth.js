const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Protects a route. Expects the header "Authorization: Bearer <token>".
// If the token is valid, stores the user's id on req.userId for later layers.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Please log in to continue');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again');
  }

  req.userId = payload.sub;
  next();
}

module.exports = requireAuth;