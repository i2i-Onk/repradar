// Checks required environment variables at startup, so missing config
// fails fast with a clear message instead of breaking later.
const REQUIRED = ['MONGO_URI', 'JWT_SECRET'];

function checkEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. ` +
        'Add them to server/.env locally, or to the environment settings on your hosting service.',
    );
  }
}

module.exports = checkEnv;