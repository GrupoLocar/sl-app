import mongoose from 'mongoose';

const FilialSchema = new mongoose.Schema({
  codigo: { type: String },
  nome:   { type: String },
}, { timestamps: false });

export default mongoose.models.Filial || mongoose.model('Filial', FilialSchema, 'filial');
