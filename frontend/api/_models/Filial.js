// frontend/api/_models/Filial.js
import mongoose from 'mongoose';

const FilialSchema = new mongoose.Schema(
  {
    codigo: { type: String }, // Ex.: "AAVIX"
    nome:   { type: String }, // opcional
  },
  { timestamps: false }
);

// força o nome da coleção exatamente 'filial'
export default mongoose.models.Filial || mongoose.model('Filial', FilialSchema, 'filial');
