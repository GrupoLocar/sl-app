// backend/src/models/Filial.js
import mongoose from 'mongoose';

const FilialSchema = new mongoose.Schema({
  cliente: String,
  distrital: String,
  razao_social: String,
  insc_estadual: String,
  cnpj: String,
  filial: { type: String, required: true, unique: true }, // sigla
  endereco: String,
  complemento: String,
  bairro: String,
  cidade: String,
  estado: String,
  cep: String,
  responsavel: String,
  cargo: String,
  telefone: String,
  email: String,
  observacao: String,
}, { timestamps: true, collection: 'filiais' });

FilialSchema.index({ filial: 1 }, { unique: true });

export default mongoose.model('Filial', FilialSchema);
