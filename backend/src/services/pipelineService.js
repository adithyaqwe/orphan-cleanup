const pipelineRepository = require('../repositories/pipelineRepository');

class PipelineService {
  async getPipelines(organizationId) {
    return pipelineRepository.findAllPipelines(organizationId);
  }

  async getPipelineRuns(organizationId, pipelineId = null, query = {}) {
    const filters = {};
    if (pipelineId) filters.pipelineId = pipelineId;
    return pipelineRepository.findAllRuns(organizationId, filters, {
      page: query.page,
      limit: query.limit,
    });
  }

  async getRunDetail(organizationId, runId) {
    const run = await pipelineRepository.findRunById(organizationId, runId);
    if (!run) {
      throw { status: 404, code: 'RUN_NOT_FOUND', message: `Pipeline run '${runId}' was not found.` };
    }
    return run;
  }
}

module.exports = new PipelineService();
