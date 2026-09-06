const express = require('express');
const router = express.Router();
const { listResources, getResourceDetail, getResourceLifecycle } = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, listResources);
router.get('/:id', protect, getResourceDetail);
router.get('/:id/lifecycle', protect, getResourceLifecycle);

module.exports = router;
