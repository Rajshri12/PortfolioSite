const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
    try {
        const auth = process.env.MONGODB_URI.split('//')[1].split('@')[0];
        const node = 'ac-dojjrxj-shard-00-00.zux2d19.mongodb.net:27017';
        const uri = `mongodb://${auth}@${node}/daily-tracker?ssl=true&authSource=admin&directConnection=true`;
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        for (let coll of collections) {
            const count = await db.collection(coll.name).countDocuments();
            console.log(`- ${coll.name}: ${count} documents`);
        const tasks = await db.collection('tasks').find().sort({_id:-1}).limit(5).toArray();
        console.log('LAST 5 MISSIONS:', JSON.stringify(tasks, null, 2));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
