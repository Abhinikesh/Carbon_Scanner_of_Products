const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { protect } = require('../middleware/authMiddleware');
const uploadSingle = require('../middleware/upload');
const validateObjectId = require('../utils/validateObjectId');
const { scanCreateLimiter } = require('../middleware/rateLimiters');

// Protect all routes
router.use(protect);

// GET /api/scans/stats - Get stats aggregation
router.get('/stats', scanController.getScanStats);

// GET /api/scans/chart - Get chart data aggregation
router.get('/chart', scanController.getScanChart);

// GET /api/scans/export - Export all scans in CSV or JSON
router.get('/export', scanController.exportScans);

// GET /api/scans - List all scans for user
router.get('/', scanController.listScans);

// GET /api/scans/:id - Get single scan details
router.get('/:id', validateObjectId('id'), scanController.getScan);

// GET /api/scans/:id/alternative - Get alternative suggestion
router.get('/:id/alternative', validateObjectId('id'), scanController.getScanAlternative);

// POST /api/scans - Upload scan (file or barcode JSON)
router.post('/', scanCreateLimiter, uploadSingle, scanController.createScan);

// PATCH /api/scans/:id/category - Update scan category and recalculate CO2
router.patch('/:id/category', validateObjectId('id'), scanController.updateScanCategory);

// DELETE /api/scans - Clear all scans for user (One-click privacy wipe)
router.delete('/', scanController.clearAllScans);

// DELETE /api/scans/:id - Delete a scan
router.delete('/:id', validateObjectId('id'), scanController.deleteScan);

module.exports = router;

