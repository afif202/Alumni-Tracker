// Tracking controller
const { TrackingService } = require('../services/trackingService');
const { StatsService } = require('../services/statsService');
const { success, error } = require('../utils/response');

class TrackingController {
  
  // POST /api/run-tracking
  static async runTracking(req, res) {
    try {
      const result = await TrackingService.runBatchTracking();
      res.json(success(result, result.message));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
  
  // GET /api/history/:alumni_id
  static async getHistory(req, res) {
    try {
      const { alumni_id } = req.params;
      const history = await TrackingService.getTrackingHistory(alumni_id);
      res.json(success(history));
    } catch (err) {
      res.status(500).json(error(err.message));
    }
  }
}

module.exports = { TrackingController };