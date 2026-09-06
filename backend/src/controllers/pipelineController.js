const pipelineService = require('../services/pipelineService');

const listPipelines = async (req, res, next) => {
  try {
    const pipelines = await pipelineService.getPipelines(req.user.organizationId);
    res.status(200).json({ success: true, data: pipelines });
  } catch (error) {
    next(error);
  }
};

const listRuns = async (req, res, next) => {
  try {
    const result = await pipelineService.getPipelineRuns(
      req.user.organizationId,
      req.query.pipelineId,
      req.query
    );
    res.status(200).json({
      success: true,
      data: result.runs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const getRunDetail = async (req, res, next) => {
  try {
    const run = await pipelineService.getRunDetail(req.user.organizationId, req.params.runId);
    res.status(200).json({ success: true, data: run });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPipelines, listRuns, getRunDetail };
