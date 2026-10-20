const dns = require('node:dns');
const mongoose = require('mongoose');

// Same Windows DNS workaround as src/config/db.js
dns.setServers(['1.1.1.1', '8.8.8.8']);

async function connectTestDB() {
  const uri = process.env.MONGO_URI_TEST;

  // Safety check: tests delete data, so refuse to run against anything
  // that isn't clearly the test database.
  if (!uri || !uri.includes('/repradar-test')) {
    throw new Error('MONGO_URI_TEST must be set and point to the repradar-test database.');
  }

  await mongoose.connect(uri);
}

// Empty every collection so each test starts from a clean slate
async function clearTestDB() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function closeTestDB() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

module.exports = { connectTestDB, clearTestDB, closeTestDB };
