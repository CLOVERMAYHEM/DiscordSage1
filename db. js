require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    console.log('✅ MongoDB connected');
    db = client.db('discordBotDB'); // Name your DB
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Export a function to get the DB once connected
function getDB() {
  if (!db) throw new Error('Database not connected yet');
  return db;
}

module.exports = {
  connectDB,
  getDB,
  client
};
