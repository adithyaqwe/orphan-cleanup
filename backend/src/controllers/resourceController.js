const resourceService = require('../services/resourceService');

const listResources = async (req, res, next) => {
  try {
    const result = await resourceService.getResources(req.user.organizationId, req.query);
    res.status(200).json({
      success: true,
      data: result.resources,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getResourceDetail = async (req, res, next) => {
  try {
    const resource = await resourceService.getResourceById(req.user.organizationId, req.params.id);
    res.status(200).json({
      success: true,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

const getResourceLifecycle = async (req, res, next) => {
  try {
    const lifecycle = await resourceService.getResourceLifecycle(req.user.organizationId, req.params.id);
    res.status(200).json({
      success: true,
      data: lifecycle,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listResources, getResourceDetail, getResourceLifecycle };
