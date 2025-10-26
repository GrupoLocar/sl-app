import mongoose from 'mongoose';

const SLschema = new mongoose.Schema({
  sl_number: { type: String }, // opcional na abertura
  priority: { type: Boolean, default: false },
  filial: { type: String, required: true },
  plate: { type: String, required: true },
  tipo_lavagem: { type: String, enum: ['LAVAGEM SIMPLES','LAVAGEM SIMPLES (Jato)','LAVAGEM ESPECIAL'], required: true },
  opened_at: { type: Date, default: Date.now },
  status: { type: String, enum: ['Aberta','Em andamento','Finalizada'], default: 'Aberta' },
  closed_at: { type: Date },
  fotos: {
    antes_url: { type: String },
    depois_url: { type: String }
  },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, collection: 'solicitacoes' });

export default mongoose.model('SL', SLschema);
