const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
    const uri = process.env.MONGODB_URI;
    console.log('Testing connection to:', uri ? uri.substring(0, 30) + '...' : 'MISSING');

    if (!uri) {
        console.error('Error: MONGODB_URI is not defined in .env.local');
        return;
    }

    try {
        console.log('Attempting to connect...');
        await mongoose.connect(uri, { 
            dbName: 'daily-tracker',
            serverSelectionTimeoutMS: 10000,
            family: 4 
        });
        console.log('✅ MongoDB Connected Successfully');

        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in database:', collections.map(c => c.name));

        // Try to fetch one task
        const Task = mongoose.model('Task', new mongoose.Schema({}, { strict: false }), 'tasks');
        const task = await Task.findOne();
        console.log('Sample Task:', task);
        
        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (err) {
        console.error('❌ Connection Failed:', err);
    }
}

testConnection();
