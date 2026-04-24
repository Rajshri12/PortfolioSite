import mongoose from 'mongoose';

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) return null;

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Manually construct the standard connection string to bypass SRV lookup issues in Node 25
    let connectionUri = MONGODB_URI;
    if (MONGODB_URI.includes('cluster0.zux2d19.mongodb.net')) {
      const auth = MONGODB_URI.split('//')[1].split('@')[0];
      const nodes = [
        'ac-dojjrxj-shard-00-00.zux2d19.mongodb.net:27017',
        'ac-dojjrxj-shard-00-01.zux2d19.mongodb.net:27017',
        'ac-dojjrxj-shard-00-02.zux2d19.mongodb.net:27017'
      ];
      connectionUri = `mongodb://${auth}@${nodes.join(',')}/daily-tracker?ssl=true&replicaSet=atlas-10blig-shard-0&authSource=admin`;
    }

    const opts = {
      bufferCommands: true,
    };

    console.log('Connecting to MongoDB via direct nodes...');
    cached.promise = mongoose.connect(connectionUri, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected Successfully (Direct)');
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('MongoDB connection error:', e.message);
    cached.promise = null;
    throw e;
  }
  
  return cached.conn;
}

export default connectToDatabase;
