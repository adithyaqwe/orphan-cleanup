const Pipeline = require('../models/Pipeline');
const PipelineRun = require('../models/PipelineRun');

class PipelineRepository {
  async findPipelineById(organizationId, pipelineId) {
    return Pipeline.findOne({ organizationId, pipelineId });
  }

  async findRunById(organizationId, runId) {
    return PipelineRun.findOne({ organizationId, runId });
  }

  async findAllPipelines(organizationId) {
    return Pipeline.find({ organizationId });
  }

  async findAllRuns(organizationId, filters = {}, options = {}) {
    const query = { organizationId, ...filters };
    const page = Math.max(1, parseInt(options.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(options.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      PipelineRun.find(query).sort({ startTime: -1 }).skip(skip).limit(limit),
      PipelineRun.countDocuments(query),
    ]);

    return {
      runs,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  async createPipeline(data) {
    return Pipeline.create(data);
  }

  async createRun(data) {
    return PipelineRun.create(data);
  }

  async deleteManyByOrg(organizationId) {
    await Promise.all([
      Pipeline.deleteMany({ organizationId }),
      PipelineRun.deleteMany({ organizationId }),
    ]);
  }
}

module.exports = new PipelineRepository();
