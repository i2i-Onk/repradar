const dashboardService = require('../services/dashboardService');

async function get(req, res) {
  const dashboard = await dashboardService.getDashboard(req.userId);
  res.status(200).json(dashboard);
}

module.exports = { get };
