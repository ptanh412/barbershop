// Script to fix MongoDB indexes for phoneNumber, googleId, and firebaseUid fields
// This script should be run after updating the mongoose schemas

const { MongoClient } = require('mongodb');

// Replace with your actual MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barbershop';

async function fixIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Fix Customer collection indexes
    console.log('Fixing Customer collection indexes...');
    const customerCollection = db.collection('customers');
    
    // Drop existing phoneNumber index if it exists (non-sparse)
    try {
      await customerCollection.dropIndex('phoneNumber_1');
      console.log('Dropped old phoneNumber index');
    } catch (error) {
      console.log('phoneNumber index not found or already dropped');
    }
    
    // Create new sparse unique index for phoneNumber
    await customerCollection.createIndex(
      { phoneNumber: 1 },
      { unique: true, sparse: true, name: 'phoneNumber_1_sparse' }
    );
    console.log('Created sparse unique index for phoneNumber');
    
    // Ensure googleId has sparse unique index
    try {
      await customerCollection.createIndex(
        { googleId: 1 },
        { unique: true, sparse: true, name: 'googleId_1_sparse' }
      );
      console.log('Created sparse unique index for googleId');
    } catch (error) {
      console.log('googleId index already exists or created');
    }
    
    // Ensure firebaseUid has sparse unique index
    try {
      await customerCollection.createIndex(
        { firebaseUid: 1 },
        { unique: true, sparse: true, name: 'firebaseUid_1_sparse' }
      );
      console.log('Created sparse unique index for firebaseUid');
    } catch (error) {
      console.log('firebaseUid index already exists or created');
    }
    
    // Fix Barber collection indexes
    console.log('Fixing Barber collection indexes...');
    const barberCollection = db.collection('barbers');
    
    // Ensure googleId has sparse unique index for barbers
    try {
      await barberCollection.createIndex(
        { googleId: 1 },
        { unique: true, sparse: true, name: 'googleId_1_sparse' }
      );
      console.log('Created sparse unique index for barber googleId');
    } catch (error) {
      console.log('Barber googleId index already exists or created');
    }
    
    // Ensure firebaseUid has sparse unique index for barbers
    try {
      await barberCollection.createIndex(
        { firebaseUid: 1 },
        { unique: true, sparse: true, name: 'firebaseUid_1_sparse' }
      );
      console.log('Created sparse unique index for barber firebaseUid');
    } catch (error) {
      console.log('Barber firebaseUid index already exists or created');
    }
    
    // List all indexes for verification
    console.log('\nCustomer collection indexes:');
    const customerIndexes = await customerCollection.listIndexes().toArray();
    customerIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    console.log('\nBarber collection indexes:');
    const barberIndexes = await barberCollection.listIndexes().toArray();
    barberIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    console.log('\nIndex migration completed successfully!');
    
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the script
fixIndexes();
