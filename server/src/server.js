const checkEnv = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

// Connect to the database first, then start accepting requests.
async function start() {
  try {
    checkEnv();
    await connectDB();
    app.listen(PORT, () => {
      console.log(`RepRadar API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();
