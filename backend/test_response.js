const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Resource = require('./src/models/Resource');
  
  const resource = await Resource.findOne({ resourceId: 'res-orphan-server-a' });
  console.log('Current state:', resource ? resource.state : 'NOT FOUND');
  
  if (!resource) { await mongoose.disconnect(); return; }

  // Simulate the exact updateState call
  const updated = await Resource.findOneAndUpdate(
    { organizationId: resource.organizationId, resourceId: 'res-orphan-server-a' },
    { $set: { state: 'RECLAIMED', 'cleanupState.status': 'RECLAIMED', 'cleanupState.reclaimedAt': new Date() } },
    { new: true, runValidators: true }
  );
  
  console.log('Updated mongoose state:', updated.state);
  
  // Simulate JSON serialization exactly as Express does it
  const serialized = updated.toJSON();
  console.log('Serialized state:', serialized.state);
  console.log('Serialized resourceId:', serialized.resourceId);
  console.log('Serialized heartbeat:', serialized.heartbeat);
  console.log('Tags type:', typeof serialized.tags, serialized.tags);
  
  // Verify state is correct
  const recheck = await Resource.findOne({ resourceId: 'res-orphan-server-a' }).lean();
  console.log('DB state after update:', recheck.state);
  
  await mongoose.disconnect();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
