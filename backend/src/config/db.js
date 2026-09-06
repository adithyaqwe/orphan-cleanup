const mongoose = require('mongoose');

/**
 * Connect to MongoDB database via Mongoose ODM
 */
const connectDB = async () => {
  mongoose.set('bufferCommands', false);
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/orphan-cleanup';
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] MongoDB Offline / Unreachable Warning: ${error.message}`);
    return null;
  }
};

module.exports = connectDB;
