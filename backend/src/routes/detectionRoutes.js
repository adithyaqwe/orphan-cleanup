const express = require('express');
const router = express.Router();
const { evaluateResourceDetection, syncAWSCloud } = require('../controllers/detectionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/evaluate/:id', protect, evaluateResourceDetection);
router.post('/sync-aws', protect, syncAWSCloud);

module.exports = router;

