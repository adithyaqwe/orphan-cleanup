const express = require('express');
const router = express.Router();
const { getPolicy, updatePolicy } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.get('/policy', protect, getPolicy);
router.put('/policy', protect, authorize('ADMIN', 'OPERATOR'), updatePolicy);

module.exports = router;
