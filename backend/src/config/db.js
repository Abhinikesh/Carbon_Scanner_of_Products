const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/climate-lens';
    await mongoose.connect(connStr);
    console.log(`MongoDB connected (${connStr.includes('@') ? 'remote' : 'local'})`);
  } catch (error) {
    // Log failure in red and continue without exiting the process
    console.error('\x1b[31mMongoDB connection failed: ' + error.message + '. Server will continue running without DB for now.\x1b[0m');
  }
};

module.exports = connectDB;
