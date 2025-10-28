// frontend/api/_models/SL.js
import mongoose from 'mongoose';

const SLSchema = new mongoose.Schema(
  {
    // Ajuste estes campos conforme seu app:
    numero: { type: String, required: true },     // ex: "SL-000123"
    placa: { type: String, required: true },      // ex: "ABC1D23"
    tipoLavagem: { type: String },                // ex: "Completa", "Simples"
    abertura: { type: Date, required: true },     // data/hora de abertura
    finalizacao: { type: Date },                  // data/hora de finalização
    status: { type: String, default: 'ABERTA' },  // "ABERTA", "EM ANDAMENTO", "FINALIZADA"
    prioridade: { type: Boolean, default: false },// flag "P" na sua tabela
    filial: { type: String },                     // unidade selecionada
    // ...outros campos usados no dashboard
  },
  { timestamps: true }
);

export default mongoose.models.SL || mongoose.model('SL', SLSchema);
