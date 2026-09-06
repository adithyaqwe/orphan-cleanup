const seedService = require('../services/seedService');

const seedGoldenScenario = async (req, res, next) => {
  try {
    const result = await seedService.seedGoldenScenario();
    res.status(200).json({
      success: true,
      message: 'Golden Scenario seeded successfully. Resource A = VERIFIED_ORPHAN, Resource B = PROTECTED (Same Age: 18h), Resource C = PROTECTED (Adopted Child).',
      data: {
        organization: result.organization.name,
        usersSeeded: Object.keys(result.users).length,
        resourcesSeeded: Object.keys(result.resources).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateScenario = async (req, res, next) => {
  try {
    const { scenarioType } = req.body;
    const orgId = req.user ? req.user.organizationId : null;
    const resource = await seedService.generateScenarioResource(scenarioType, orgId);
    res.status(201).json({
      success: true,
      message: `Generated simulated scenario: ${scenarioType}`,
      data: resource,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { seedGoldenScenario, generateScenario };
