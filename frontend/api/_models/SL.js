// frontend/api/_models/SL.js
import mongoose from 'mongoose';

const SLSchema = new mongoose.Schema(
  {
    sl_number:   { type: String },              // opcional
    plate:       { type: String, required: true },
    tipo_lavagem:{ type: String },
    opened_at:   { type: Date },
    closed_at:   { type: Date },
    status:      { type: String, default: 'Aberta' }, // "Aberta" | "Em andamento" | "Finalizada"
    priority:    { type: Boolean, default: false },
    observacao:  { type: String, default: '' },
    filial:      { type: String },              // código da unidade
  },
  { timestamps: true }
);

export default mongoose.models.SL || mongoose.model('SL', SLSchema);
