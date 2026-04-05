// Updated tracking routes - clean and modular
const express = require('express');
const router = express.Router();
const { AlumniController } = require('../controllers/alumniController');
const { TrackingController } = require('../controllers/trackingController');
const { StatsController } = require('../controllers/statsController');

// Alumni routes
router.get('/alumni', AlumniController.getAll);
router.get('/alumni/:id/detail', AlumniController.getDetail);
router.post('/alumni', AlumniController.create);
router.put('/alumni/:id', AlumniController.update);
router.delete('/alumni/:id', AlumniController.delete);

// Tracking routes
router.post('/run-tracking', TrackingController.runTracking);
router.get('/history/:alumni_id', TrackingController.getHistory);

// Stats routes
router.get('/stats', StatsController.getStats);

module.exports = router;