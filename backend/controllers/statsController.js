// Statistics controller
const { StatsService } = require('../services/statsService');
const { success, error } = require('../utils/response');

class StatsController {
  
  // GET /api/stats
  static async getStats(req, res) {
    try {
      const stats = await StatsService.getDashboardStats();
      res.json(success(stats));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
}

module.exports = { StatsController };