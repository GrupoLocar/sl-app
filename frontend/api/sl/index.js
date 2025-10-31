import { connectToDB } from '../_lib/db.js';
import SL from '../_models/SL.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  try {
    const conn = await connectToDB();

    if (!conn) {
      if (req.method === 'GET') return res.status(200).json([]);
      return res.status(503).json({ error: 'DB indisponível' });
    }

    if (req.method === 'GET') {
      const { filial, status, prioridade } = req.query;
      const q = {};
      if (filial) q.filial = filial;
      if (status) q.status = status;
      if (typeof prioridade !== 'undefined') q.priority = String(prioridade) === 'true';

      const rows = await SL.find(q).sort({ opened_at: 1 }).lean();
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const body = await readJson(req);
      const doc = {
        status: body?.status || 'Aberta',
        opened_at: body?.opened_at ? new Date(body.opened_at) : new Date(),
        ...body,
      };
      const created = await SL.create(doc);
      return res.status(201).json(created);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Erro /api/sl:', err?.message || err);
    if (req.method === 'GET') {
      res.setHeader('X-Error', 'sl-list-failed');
      return res.status(200).json([]);
    }
    return res.status(500).json({ error: 'Internal error', details: err?.message || 'unknown' });
  }
}

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
