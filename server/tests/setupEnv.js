const fs = require('node:fs');
const { parseEnv } = require('node:util');

// Load server/.env if it exists (on your laptop). In CI there's no .env file,
// so values come from GitHub secrets instead.
// Note: process.loadEnvFile() doesn't work here, because Jest gives each test
// file its own copy of process.env, so we copy the values in ourselves.
try {
  const vars = parseEnv(fs.readFileSync('.env', 'utf8'));
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] ??= value;
  }
} catch {
  // No .env file: fine in CI
}

// Test-only settings. Real secrets are never used in tests.
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

// High rate limits so the many signups and logins across the test suite aren't
// throttled. tests/rateLimit.test.js sets its own small limits.
process.env.LOGIN_RATE_LIMIT_MAX ??= '10000';
process.env.SIGNUP_RATE_LIMIT_MAX ??= '10000';
