import mongoose from 'mongoose';

const { MONGODB_URI } = process.env;

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

mongoose.set('strictQuery', true);

export async function connectToDB() {
  if (!MONGODB_URI) {
    console.warn('MONGODB_URI não definido.');
    return null;
  }
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 12000,
      socketTimeoutMS: 45000,
    }).then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
