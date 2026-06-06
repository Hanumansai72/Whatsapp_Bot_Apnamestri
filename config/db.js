const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Use Google DNS to fix SRV lookup failures on restricted networks
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const mongoURI = "mongodb+srv://hanumansai72:PHxojTiAxGCBVXbJ@cluster0.lfuudui.mongodb.net/apana_mestri?retryWrites=true&w=majority&appName=Cluster0";

    if (!mongoURI) {
      console.error('MongoDB URI is not defined in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI, {
      family: 4,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;

