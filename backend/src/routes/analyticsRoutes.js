const express = require('express');
const router = express.Router();
const { getAnalyticsSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/summary', protect, getAnalyticsSummary);

module.exports = router;
