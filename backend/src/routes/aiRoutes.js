const express = require('express');
const router = express.Router();
const { analyzeResourceWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/analyze/:id', protect, analyzeResourceWithAI);

module.exports = router;
