const express = require('express');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use('/api/users', userRoutes);


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