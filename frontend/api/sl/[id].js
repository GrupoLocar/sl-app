// frontend/api/sl/[id].js
import { connectToDB } from '../_lib/db.js';
import SL from '../_models/SL.js';

export const config = {
  runtime: 'nodejs18.x',
};

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    await connectToDB();

    if (req.method === 'GET') {
      const row = await SL.findById(id).lean();
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(row);
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || (await readJson(req));
      const updated = await SL.findByIdAndUpdate(id, body, { new: true, runValidators: true }).lean();
      if (!updated) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      const deleted = await SL.findByIdAndDelete(id).lean();
      if (!deleted) return res.status(404).json({ error: 'Not found' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal error', details: err.message });
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
