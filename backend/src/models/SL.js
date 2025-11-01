// backend/models/sl.js
import mongoose from "mongoose";

function onlyASCII(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/gi, "c");
}

function generateSLNumber() {
  // 8 dígitos numéricos, como "22158952"
  return Math.floor(10_000_000 + Math.random() * 89_999_999).toString();
}

const SLSchema = new mongoose.Schema(
  {
    sl_number: {
      type: String,
      // NÃO marque index aqui para evitar índice duplicado;
      // o índice único será declarado via schema.index() (parcial) mais abaixo.
      trim: true,
    },
    filial: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    priority: {
      type: Boolean,
      default: false,
    },
    plate: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      // não use unique aqui — usaremos índice composto com data
    },
    tipo_lavagem: {
      type: String,
      default: "LAVAGEM SIMPLES (Jato)",
      set: (v) => onlyASCII(String(v || "").toUpperCase()),
    },
    observacao: {
      type: String,
      default: "",
      set: (v) => onlyASCII(String(v || "")),
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ["Aberta", "Em andamento", "Finalizada"],
      default: "Aberta",
    },
    opened_at: {
      type: Date,
      default: () => new Date(),
    },
    closed_at: {
      type: Date,
    },

    // campo derivado (YYYY-MM-DD) para índice composto de placa + data
    opened_date: {
      type: String,
      // ex.: "2025-10-27"
    },
  },
  { timestamps: true, collection: "sls" }
);

/** Normalizações + defaults seguros */
SLSchema.pre("validate", function (next) {
  // Se não veio sl_number (ou veio vazio), não deixe string vazia ir ao índice
  if (this.sl_number != null && this.sl_number.trim() === "") {
    this.sl_number = undefined;
  }
  // Gera automaticamente se continuar sem sl_number
  if (!this.sl_number) {
    this.sl_number = generateSLNumber();
  }
  // opened_at padrão
  if (!this.opened_at) this.opened_at = new Date();

  // Abastece opened_date (YYYY-MM-DD) para o índice composto com placa
  if (this.opened_at instanceof Date && !isNaN(this.opened_at.getTime())) {
    const y = this.opened_at.getFullYear();
    const m = String(this.opened_at.getMonth() + 1).padStart(2, "0");
    const d = String(this.opened_at.getDate()).padStart(2, "0");
    this.opened_date = `${y}-${m}-${d}`;
  }

  next();
});

/** Índices */
// 1) Índice simples em filial (apenas aqui, para evitar duplicado)
SLSchema.index({ filial: 1 });

// 2) Único SOMENTE quando sl_number existir e não for string vazia
SLSchema.index(
  { sl_number: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sl_number: { $exists: true, $type: "string", $ne: "" },
    },
    name: "uniq_sl_number_when_present",
  }
);

// 3) Único por (placa + filial + data) — impede mesma placa na mesma data na mesma unidade
SLSchema.index(
  { plate: 1, filial: 1, opened_date: 1 },
  {
    unique: true,
    partialFilterExpression: {
      plate: { $exists: true, $type: "string", $ne: "" },
      filial: { $exists: true, $type: "string", $ne: "" },
      opened_date: { $exists: true, $type: "string", $ne: "" },
    },
    name: "uniq_plate_by_filial_and_opened_date",
  }
);

const SL = mongoose.models.SL || mongoose.model("SL", SLSchema);
export default SL;
