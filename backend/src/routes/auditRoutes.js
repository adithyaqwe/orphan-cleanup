const express = require('express');
const router = express.Router();
const { listAuditEvents } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, listAuditEvents);

module.exports = router;
