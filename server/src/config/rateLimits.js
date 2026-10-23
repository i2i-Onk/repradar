// Limits for the login and signup rate limiters (middleware/rateLimiters.js).
// The defaults suit production. The *_MAX environment variables are optional;
// tests use them to raise or lower the limits.

function positiveInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const RATE_LIMITS = {
  // Only failed logins count, so normal users never hit this
  login: { windowMs: 15 * 60 * 1000, max: positiveInt('LOGIN_RATE_LIMIT_MAX', 10) },
  // Generous: a whole class on one school Wi-Fi shares a single IP address
  signup: { windowMs: 60 * 60 * 1000, max: positiveInt('SIGNUP_RATE_LIMIT_MAX', 20) },
};

// How many proxies sit in front of the app. On Render, requests arrive through
// Render's own proxy, so set TRUST_PROXY=1 there; otherwise every user would
// look like the same IP address and share one limit. Locally there's no proxy (0).
// Trusting more proxies than really exist would let anyone fake their IP.
function trustProxySetting() {
  const value = Number(process.env.TRUST_PROXY);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

module.exports = { RATE_LIMITS, trustProxySetting };
