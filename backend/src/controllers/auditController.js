const auditRepository = require('../repositories/auditRepository');

const listAuditEvents = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.result) filters.result = req.query.result;

    const result = await auditRepository.findAll(req.user.organizationId, filters, {
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json({
      success: true,
      data: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listAuditEvents };
