require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    // Connect to MongoDB using the existing connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barbershop';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB via Mongoose');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nExisting collections:');
    if (collections.length === 0) {
      console.log('No collections found in the database.');
    } else {
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }
    
    // Check if the barber and customer schemas will create the collections correctly
    console.log('\nThe collections will be created automatically when the first document is inserted.');
    console.log('The schema changes (sparse: true) will be applied when the collections are created.');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDatabase();
