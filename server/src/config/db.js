const dns = require('node:dns');

// Workaround: on some Windows networks, Node can't resolve MongoDB's SRV
// records through the default DNS server, so use public DNS resolvers instead.
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');

// Connects to MongoDB using the connection string from environment variables.
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not set. Check your .env file.');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
