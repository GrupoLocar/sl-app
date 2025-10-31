import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password_hash: { type: String, required: true },
  filiais: [{ type: String }],
  role: { type: String, default: 'higienizador' }
}, { timestamps: true, collection: 'users' });

export default mongoose.model('User', UserSchema);
