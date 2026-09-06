const cleanupEngine = require('../cleanup/cleanupEngine');
const mongoose = require('mongoose');

class AutoCleanupService {
  constructor() {
    this.timer = null;
    this.isProcessing = false;
  }

  start(intervalMs = 2000) {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), intervalMs);
    console.log('[AutoCleanupService] Background grace period worker started.');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick() {
    if (this.isProcessing) return;
    if (mongoose.connection.readyState !== 1) return; // DB not ready

    this.isProcessing = true;
    try {
      // Find distinct org IDs or process default org
      const Organization = mongoose.model('Organization');
      const orgs = await Organization.find({}).select('_id');
      for (const org of orgs) {
        await cleanupEngine.processAutomaticReclamations(org._id);
      }
    } catch (err) {
      // Silent error catching in background worker loop
    } finally {
      this.isProcessing = false;
    }
  }
}

module.exports = new AutoCleanupService();
