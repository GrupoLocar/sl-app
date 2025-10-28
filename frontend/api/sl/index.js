// frontend/api/sl/index.js
import { connectToDB } from '../_lib/db.js';
import SL from '../_models/SL.js';

// Vercel Functions (Edge não; Node.js runtime)
export const config = {
  runtime: 'nodejs18.x',
};

export default async function handler(req, res) {
  try {
    await connectToDB();

    if (req.method === 'GET') {
      // filtros básicos (opcional): ?filial=AAVIX&status=ABERTA
      const { filial, status, prioridade } = req.query;
      const q = {};
      if (filial) q.filial = filial;
      if (status) q.status = status;
      if (typeof prioridade !== 'undefined') q.prioridade = prioridade === 'true';

      // Se sua UI pede ordenação por "abertura" crescente:
      const rows = await SL.find(q).sort({ abertura: 1 }).lean();
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = req.body || (await readJson(req));
      const created = await SL.create(body);
      return res.status(201).json(created);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
  }
}

// Helper para quando req.body vier vazio em serverless
async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
