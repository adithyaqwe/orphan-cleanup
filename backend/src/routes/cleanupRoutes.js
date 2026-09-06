const express = require('express');
const router = express.Router();
const {
  reclaimResource,
  scheduleReclamation,
  cancelGracePeriod,
  finalizeReclamation,
  reverseReclamation,
  protectHumanReview,
  approveHumanReviewReclaim,
} = require('../controllers/cleanupController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');

router.post('/reclaim/:id', protect, authorize('ADMIN', 'OPERATOR'), reclaimResource);
router.post('/schedule/:id', protect, authorize('ADMIN', 'OPERATOR'), scheduleReclamation);
router.post('/cancel/:id', protect, authorize('ADMIN', 'OPERATOR'), cancelGracePeriod);
router.post('/finalize/:id', protect, authorize('ADMIN', 'OPERATOR'), finalizeReclamation);
router.post('/reverse/:id', protect, authorize('ADMIN', 'OPERATOR'), reverseReclamation);
router.post('/human-review/:id/protect', protect, authorize('ADMIN', 'OPERATOR'), protectHumanReview);
router.post('/human-review/:id/approve-reclaim', protect, authorize('ADMIN', 'OPERATOR'), approveHumanReviewReclaim);

module.exports = router;
