const express = require('express');
const router = express.Router();
const { getDependencyGraph } = require('../controllers/dependencyController');
const { protect } = require('../middleware/authMiddleware');

router.get('/graph', protect, getDependencyGraph);

module.exports = router;
