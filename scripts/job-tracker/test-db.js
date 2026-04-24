const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setServers(['8.8.8.8']);


const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const MONGODB_URI = envFile.match(/MONGODB_URI=(.*)/)?.[1]?.trim();


console.log('Testing connection to:', MONGODB_URI ? MONGODB_URI.substring(0, 30) + '...' : 'MISSING');

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

mongoose.connect(MONGODB_URI, { bufferCommands: false })
    .then(() => {
        console.log('SUCCESS: Connected to MongoDB Atlas successfully!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('FAILURE: Could not connect to MongoDB:');
        console.error(err);
        process.exit(1);
    });
