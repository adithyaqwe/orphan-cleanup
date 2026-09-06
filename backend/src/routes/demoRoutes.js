const express = require('express');
const router = express.Router();
const { seedGoldenScenario, generateScenario } = require('../controllers/demoController');

router.post('/seed', seedGoldenScenario);
router.post('/generate-scenario', generateScenario);
router.post('/generate', generateScenario);

module.exports = router;
