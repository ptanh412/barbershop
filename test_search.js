const { MongoClient } = require('mongodb');

async function testSearch() {
    const client = new MongoClient('mongodb+srv://phitoichin:phitoichin@booking.qqnqd.mongodb.net/barbershop?retryWrites=true&w=majority&appName=booking');
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('barbershop');
        const collection = db.collection('shops');
        
        // Count all shops
        const totalShops = await collection.countDocuments();
        console.log(`Total shops in database: ${totalShops}`);
        
        // Get all shops to see their structure
        const allShops = await collection.find({}).toArray();
        console.log('All shops:', JSON.stringify(allShops, null, 2));
        
        // Test search for "haircut"
        const haircutSearch = await collection.find({
            $or: [
                { shop_name: { $regex: 'haircut', $options: 'i' } },
                { address: { $regex: 'haircut', $options: 'i' } },
                { 'services.name': { $regex: 'haircut', $options: 'i' } },
            ]
        }).toArray();
        console.log('Haircut search results:', JSON.stringify(haircutSearch, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

testSearch();
