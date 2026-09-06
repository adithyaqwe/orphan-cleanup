const express = require('express');
const router = express.Router();
const { login, logout, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getCurrentUser);

module.exports = router;
