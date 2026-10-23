const { rateLimit } = require('express-rate-limit');
const { RATE_LIMITS } = require('../config/rateLimits');

// Replies in the same { message } shape as errorHandler, and logs the IP that
// was blocked, so Render's logs show whether TRUST_PROXY is set correctly
// (real visitor IPs, not the same proxy address every time).
function blockWith(message) {
  return (req, res, next, options) => {
    console.warn(`Rate limit: ${req.method} ${req.originalUrl} blocked for ${req.ip}`);
    res.status(options.statusCode).json({ message });
  };
}

const common = {
  standardHeaders: 'draft-8', // RateLimit headers tell clients how many tries are left
  legacyHeaders: false,
};

// Slows down password guessing: counts failed logins per IP address
const loginLimiter = rateLimit({
  ...common,
  windowMs: RATE_LIMITS.login.windowMs,
  limit: RATE_LIMITS.login.max,
  skipSuccessfulRequests: true,
  handler: blockWith('Too many failed login attempts. Please wait 15 minutes and try again.'),
});

// Stops one IP address creating lots of accounts
const signupLimiter = rateLimit({
  ...common,
  windowMs: RATE_LIMITS.signup.windowMs,
  limit: RATE_LIMITS.signup.max,
  handler: blockWith('Too many accounts created from this network. Please try again later.'),
});

module.exports = { loginLimiter, signupLimiter };
