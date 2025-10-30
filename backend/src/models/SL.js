// import mongoose from 'mongoose';

// const SLschema = new mongoose.Schema({
//   sl_number: { type: String }, // opcional na abertura
//   priority: { type: Boolean, default: false },
//   filial: { type: String, required: true },
//   plate: { type: String, required: true },
//   tipo_lavagem: { type: String, enum: ['LAVAGEM SIMPLES','LAVAGEM SIMPLES (Jato)','LAVAGEM ESPECIAL'], required: true },
//   opened_at: { type: Date, default: Date.now },
//   status: { type: String, enum: ['Aberta','Em andamento','Finalizada'], default: 'Aberta' },
//   closed_at: { type: Date },
//   fotos: {
//     antes_url: { type: String },
//     depois_url: { type: String }
//   },
//   created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
// }, { timestamps: true, collection: 'solicitacoes' });

// export default mongoose.model('SL', SLschema);


import mongoose from "mongoose";

const SLSchema = new mongoose.Schema(
  {
    filial: { type: String, required: true, uppercase: true, trim: true },
    sl_number: { type: String, trim: true }, // pode ser vazio (opcional), mas único quando informado
    priority: { type: Boolean, default: false },

    plate: { type: String, required: true, uppercase: true, trim: true },
    tipo_lavagem: { type: String, required: true, trim: true },

    // NOVO CAMPO: observacao (textarea -> string livre)
    observacao: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["Aberta", "Em andamento", "Finalizada"],
      default: "Aberta",
    },
    opened_at: { type: Date, default: () => new Date() },
    closed_at: { type: Date, default: null },
    fotos: {
      antes_url: { type: String },
      depois_url: { type: String }
    },
  },
  { timestamps: true }
);

// Índices úteis
// sl_number deve ser único apenas quando estiver preenchido
SLSchema.index({ sl_number: 1 }, { unique: true, sparse: true });

// placa não pode duplicar na MESMA DATA (00:00–23:59:59)
SLSchema.index(
  { plate: 1, filial: 1, opened_at: 1 },
  { name: "uniq_plate_per_day_and_filial" }
);

// Helper para garantir “mesmo dia” (comparação no controller/rota, se houver)
SLSchema.statics.isSameDay = (a, b) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const SL = mongoose.model("SL", SLSchema);
export default SL;
