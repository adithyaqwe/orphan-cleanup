const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { sanitizeInput } = require('./middleware/sanitizeMiddleware');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const pipelineRoutes = require('./routes/pipelineRoutes');
const dependencyRoutes = require('./routes/dependencyRoutes');
const auditRoutes = require('./routes/auditRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const demoRoutes = require('./routes/demoRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cleanupRoutes = require('./routes/cleanupRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeInput);

// Base health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'PASS',
    system: 'OrphanCleanup API Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'PASS',
    system: 'OrphanCleanup API Engine',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount Core API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/pipelines', pipelineRoutes);
app.use('/api/dependencies', dependencyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/detection', detectionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cleanup', cleanupRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested API route was not found.',
    },
  });
});

// Global Error Handler (No sensitive details exposed)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[ServerError]', err.message || err);
  }
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal server error occurred.',
    },
  });
});

const PORT = process.env.PORT || 5000;

const autoCleanupService = require('./services/autoCleanupService');

if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    autoCleanupService.start(2000);
    app.listen(PORT, () => {
      console.log(`[OrphanCleanup API] Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  });
}

module.exports = app;
