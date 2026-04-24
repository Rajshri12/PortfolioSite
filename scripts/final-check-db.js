const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
    try {
        const auth = process.env.MONGODB_URI.split('//')[1].split('@')[0];
        const nodes = [
            'ac-dojjrxj-shard-00-00.zux2d19.mongodb.net:27017',
            'ac-dojjrxj-shard-00-01.zux2d19.mongodb.net:27017',
            'ac-dojjrxj-shard-00-02.zux2d19.mongodb.net:27017'
        ];
        const uri = `mongodb://${auth}@${nodes.join(',')}/daily-tracker?ssl=true&replicaSet=atlas-2z4o9r-shard-0&authSource=admin`;
        
        console.log('Connecting to:', uri.substring(0, 50) + '...');
        await mongoose.connect(uri);
        console.log('✅ Connected.');
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        
        for (let c of collections) {
            const count = await db.collection(c.name).countDocuments();
            console.log(`Collection ${c.name}: ${count} docs`);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
