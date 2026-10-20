const express = require('express');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
app.use('/api/users', userRoutes);

// Security headers (protects against common browser-based attacks)
app.use(helmet());

// Only allow requests from our own frontend(s). CLIENT_ORIGIN can hold
// several comma-separated URLs, e.g. local dev and the Vercel site.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({ origin: allowedOrigins }));

// Parse incoming JSON request bodies so they're available as req.body
app.use(express.json());

// Health check: Render and the uptime monitor call this to confirm the API is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// Any request that didn't match a route above
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Registered last so it catches errors from everything above
app.use(errorHandler);

module.exports = app;