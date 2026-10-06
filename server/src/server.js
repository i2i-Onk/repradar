const app = require('./app');

// Render provides PORT automatically; locally it comes from .env
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`RepRadar API running on http://localhost:${PORT}`);
});