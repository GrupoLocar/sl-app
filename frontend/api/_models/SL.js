import mongoose from 'mongoose';

const SLSchema = new mongoose.Schema({
  sl_number:   { type: String },
  plate:       { type: String, required: true },
  tipo_lavagem:{ type: String },
  opened_at:   { type: Date },
  closed_at:   { type: Date },
  status:      { type: String, default: 'Aberta' },
  priority:    { type: Boolean, default: false },
  observacao:  { type: String, default: '' },
  filial:      { type: String },
}, { timestamps: true });

export default mongoose.models.SL || mongoose.model('SL', SLSchema);
