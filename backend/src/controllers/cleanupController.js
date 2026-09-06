const cleanupEngine = require('../cleanup/cleanupEngine');

const reclaimResource = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const result = await cleanupEngine.executeSafeReclamation(req.user, resourceId);

    if (!result.success) {
      // Special case: liveness detected right before deletion — state was REVERSED to PROTECTED
      // Return 200 so frontend handles as a warning (not a crash), with the updated resource data
      if (result.code === 'RECLAIM_REVERSED_LIVENESS_DETECTED') {
        return res.status(200).json({
          success: false,
          code: result.code,
          message: result.message,
          data: result.data,
          reason: result.reason,
        });
      }

      const statusCode = result.code === 'CONCURRENCY_LOCK_ACTIVE' ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          checks: result.checks,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Resource '${resourceId}' was successfully reclaimed.`,
      data: result.data,
      cloudResult: result.cloudResult,
      checks: result.checks,
    });
  } catch (error) {
    next(error);
  }
};

const scheduleReclamation = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const { gracePeriodSeconds } = req.body;
    const result = await cleanupEngine.scheduleTwoPhaseDelete(req.user, resourceId, gracePeriodSeconds || 300);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          checks: result.checks,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Resource '${resourceId}' scheduled for reclamation (PENDING_RECLAMATION).`,
      data: result.data,
      gracePeriodSeconds: result.gracePeriodSeconds,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

const finalizeReclamation = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const result = await cleanupEngine.finalizeTwoPhaseDelete(req.user, resourceId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
          data: result.data,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Resource '${resourceId}' final reclamation executed cleanly.`,
      data: result.data,
      cloudResult: result.cloudResult,
    });
  } catch (error) {
    next(error);
  }
};

const reverseReclamation = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const { reason } = req.body;
    const result = await cleanupEngine.reverseReclamation(req.user, resourceId, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const cancelGracePeriod = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const result = await cleanupEngine.cancelGracePeriod(req.user, resourceId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const protectHumanReview = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const { reason } = req.body;
    const result = await cleanupEngine.protectHumanReviewResource(req.user, resourceId, reason);

    if (!result.success) {
      const statusCode = result.code === 'CONCURRENCY_LOCK_ACTIVE' ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: { code: result.code, message: result.message },
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

const approveHumanReviewReclaim = async (req, res, next) => {
  try {
    const { id: resourceId } = req.params;
    const { reason } = req.body;
    const result = await cleanupEngine.approveHumanReviewReclaim(req.user, resourceId, reason);

    if (!result.success) {
      const statusCode = result.code === 'CONCURRENCY_LOCK_ACTIVE' ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: { code: result.code, message: result.message, checks: result.checks },
        data: result.data,
      });
    }

    res.status(200).json({
      success: true,
      message: result.message || `Reclamation authorized by human operator for resource '${resourceId}'. Grace period started.`,
      data: result.data,
      gracePeriodSeconds: result.gracePeriodSeconds,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reclaimResource,
  scheduleReclamation,
  cancelGracePeriod,
  finalizeReclamation,
  reverseReclamation,
  protectHumanReview,
  approveHumanReviewReclaim,
};
