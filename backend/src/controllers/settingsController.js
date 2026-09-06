const policyRepository = require('../repositories/policyRepository');

const getPolicy = async (req, res, next) => {
  try {
    const policy = await policyRepository.getPolicy(req.user.organizationId);
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

const updatePolicy = async (req, res, next) => {
  try {
    const policy = await policyRepository.updatePolicy(req.user.organizationId, req.body);
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPolicy, updatePolicy };
