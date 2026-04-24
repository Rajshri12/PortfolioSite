const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { dbName: 'daily-tracker', family: 4 });
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections Found:', collections.map(c => c.name));
        
        for (let coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`- ${coll.name}: ${count} documents`);
            if (count > 0) {
                const sample = await db.collection(coll.name).findOne();
                console.log(`  Sample ${coll.name}:`, JSON.stringify(sample).substring(0, 100));
            }
        }
        process.exit(0);
    } catch (e) {
        console.error('Check failed:', e);
        process.exit(1);
    }
}
check();
