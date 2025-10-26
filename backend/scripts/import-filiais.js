// backend/scripts/import-filiais.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Filial from '../src/models/Filial.js';

// remove acentos/ç dos valores (somente dados; nomes de campos já estão sem acentos)
function normalizeValue(v) {
  if (typeof v !== 'string') return v;
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/ç/gi, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

async function run() {
  const filePath = path.join(process.cwd(), 'grupolocar.filiais.json');
  if (!fs.existsSync(filePath)) {
    console.error('Arquivo grupolocar.filiais.json não encontrado no diretório backend/');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let data = [];
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('JSON inválido:', e.message);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { dbName: 'SL' });

  // upsert por "filial" (sigla)
  let ok = 0, fail = 0;
  for (const row of data) {
    try {
      const doc = {
        cliente:       normalizeValue(row.cliente),
        distrital:     normalizeValue(row.distrital),
        razao_social:  normalizeValue(row.razao_social || row['razao social'] || row.razao || row.razaoSocial),
        insc_estadual: normalizeValue(row.insc_estadual || row['insc estadual'] || row.ie),
        cnpj:          normalizeValue(row.cnpj),
        filial:        normalizeValue(row.filial || row.Filial || row.sigla)?.toUpperCase(),
        endereco:      normalizeValue(row.endereco),
        complemento:   normalizeValue(row.complemento),
        bairro:        normalizeValue(row.bairro),
        cidade:        normalizeValue(row.cidade),
        estado:        normalizeValue(row.estado),
        cep:           normalizeValue(row.cep),
        responsavel:   normalizeValue(row.responsavel),
        cargo:         normalizeValue(row.cargo),
        telefone:      normalizeValue(row.telefone),
        email:         normalizeValue(row.email),
        observacao:    normalizeValue(row.observacao),
      };

      if (!doc.filial) {
        console.warn('Registro sem "filial" (sigla) — ignorado:', row);
        fail++;
        continue;
      }

      await Filial.updateOne({ filial: doc.filial }, { $set: doc }, { upsert: true });
      ok++;
    } catch (e) {
      console.error('Falha ao importar registro:', e.message);
      fail++;
    }
  }

  console.log(`Import finalizado. Sucesso: ${ok} | Falhas: ${fail}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('Erro geral no import:', e);
  process.exit(1);
});
