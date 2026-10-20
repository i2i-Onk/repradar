const express = require('express');

const app = express();

// Parse incoming JSON request bodies so they're available as req.body
app.use(express.json());

// Health check: Render and the uptime monitor call this to confirm the API is alive
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
