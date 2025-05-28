require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    // Connect to MongoDB using the existing connection string
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/barbershop';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB via Mongoose');
    
    const db = mongoose.connection.db;
    
    // Fix Customer collection indexes
    console.log('Fixing Customer collection indexes...');
    const customerCollection = db.collection('customers');
    
    // List existing indexes
    console.log('Current customer indexes:');
    const existingCustomerIndexes = await customerCollection.listIndexes().toArray();
    existingCustomerIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    // Drop existing phoneNumber index if it exists and is not sparse
    try {
      const phoneNumberIndex = existingCustomerIndexes.find(idx => 
        idx.key && idx.key.phoneNumber && !idx.sparse
      );
      if (phoneNumberIndex) {
        await customerCollection.dropIndex(phoneNumberIndex.name);
        console.log(`Dropped old phoneNumber index: ${phoneNumberIndex.name}`);
      }
    } catch (error) {
      console.log('phoneNumber index not found or already dropped');
    }
    
    // Create new sparse unique index for phoneNumber
    try {
      await customerCollection.createIndex(
        { phoneNumber: 1 },
        { unique: true, sparse: true, name: 'phoneNumber_1_sparse' }
      );
      console.log('Created sparse unique index for phoneNumber');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('phoneNumber sparse index already exists');
      } else {
        console.log('Error creating phoneNumber index:', error.message);
      }
    }
    
    // Ensure googleId has sparse unique index
    try {
      await customerCollection.createIndex(
        { googleId: 1 },
        { unique: true, sparse: true, name: 'googleId_1_sparse' }
      );
      console.log('Created sparse unique index for googleId');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('googleId sparse index already exists');
      } else {
        console.log('Error creating googleId index:', error.message);
      }
    }
    
    // Ensure firebaseUid has sparse unique index
    try {
      await customerCollection.createIndex(
        { firebaseUid: 1 },
        { unique: true, sparse: true, name: 'firebaseUid_1_sparse' }
      );
      console.log('Created sparse unique index for firebaseUid');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('firebaseUid sparse index already exists');
      } else {
        console.log('Error creating firebaseUid index:', error.message);
      }
    }
    
    // Fix Barber collection indexes
    console.log('\nFixing Barber collection indexes...');
    const barberCollection = db.collection('barbers');
    
    // Ensure googleId has sparse unique index for barbers
    try {
      await barberCollection.createIndex(
        { googleId: 1 },
        { unique: true, sparse: true, name: 'googleId_1_sparse' }
      );
      console.log('Created sparse unique index for barber googleId');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Barber googleId sparse index already exists');
      } else {
        console.log('Error creating barber googleId index:', error.message);
      }
    }
    
    // Ensure firebaseUid has sparse unique index for barbers
    try {
      await barberCollection.createIndex(
        { firebaseUid: 1 },
        { unique: true, sparse: true, name: 'firebaseUid_1_sparse' }
      );
      console.log('Created sparse unique index for barber firebaseUid');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Barber firebaseUid sparse index already exists');
      } else {
        console.log('Error creating barber firebaseUid index:', error.message);
      }
    }
    
    // List all indexes for verification
    console.log('\nFinal Customer collection indexes:');
    const finalCustomerIndexes = await customerCollection.listIndexes().toArray();
    finalCustomerIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    console.log('\nFinal Barber collection indexes:');
    const finalBarberIndexes = await barberCollection.listIndexes().toArray();
    finalBarberIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    console.log('\n✅ Index migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixIndexes();
