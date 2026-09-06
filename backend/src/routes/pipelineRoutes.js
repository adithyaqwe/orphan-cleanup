const express = require('express');
const router = express.Router();
const { listPipelines, listRuns, getRunDetail } = require('../controllers/pipelineController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, listPipelines);
router.get('/runs', protect, listRuns);
router.get('/runs/:runId', protect, getRunDetail);

module.exports = router;
