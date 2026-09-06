const resourceRepository = require('../repositories/resourceRepository');

const getAnalyticsSummary = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { resources } = await resourceRepository.findAll(orgId, {}, { limit: 1000 });

    const total = resources.length;
    const active = resources.filter((r) => r.state === 'ACTIVE').length;
    const protectedCount = resources.filter((r) => r.state === 'PROTECTED').length;
    const orphanCandidates = resources.filter((r) => r.state === 'ORPHAN_CANDIDATE').length;
    const verifiedOrphans = resources.filter((r) => r.state === 'VERIFIED_ORPHAN').length;
    const reclaimed = resources.filter((r) => r.state === 'RECLAIMED').length;
    const needsReview = resources.filter((r) => r.state === 'NEEDS_REVIEW' || r.state === 'HUMAN_REVIEW_REQUIRED').length;
    const humanReviewCount = needsReview;

    res.status(200).json({
      success: true,
      data: {
        totalResources: total,
        activeResources: active,
        protectedResources: protectedCount,
        orphanCandidates,
        verifiedOrphans,
        reclaimedResources: reclaimed,
        needsReview,
        humanReviewCount,
        principleMessage: 'WHEN THE SYSTEM IS UNCERTAIN, IT DOES NOT DELETE — IT ASKS A HUMAN.',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalyticsSummary };
