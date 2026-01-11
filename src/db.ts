const mongoose = require('mongoose');

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    console.log('=> using existing database connection');
    return;
  }

  console.log('=> using new database connection');
  const db = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, 
  });

  isConnected = db.connections[0].readyState;
};

module.exports = connectToDatabase;