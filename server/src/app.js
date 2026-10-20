const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers (protects against common browser-based attacks)
app.use(helmet());

// Only allow requests from our own frontend(s). CLIENT_ORIGIN can hold
// several comma-separated URLs, e.g. local dev and the Vercel site.
// Clean each origin so stray spaces, quotes, Windows line endings or a
// trailing slash in CLIENT_ORIGIN can't cause a silent mismatch.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/^["']|["']$/g, '').replace(/\/$/, ''));


app.use(cors({ origin: allowedOrigins }));

// Parse incoming JSON request bodies so they're available as req.body
app.use(express.json());

// Health check: Render and the uptime monitor call this to confirm the API is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Registered last so it catches errors from everything above
app.use(errorHandler);

module.exports = app;