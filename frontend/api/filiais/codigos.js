// frontend/api/filiais/codigos.js
import { connectToDB } from '../_lib/db.js';
import Filial from '../_models/Filial.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const conn = await connectToDB();
    if (!conn) {
      // Sem DB configurado, não derruba a UI
      return res.status(200).json([]);
    }

    const docs = await Filial.find({}, { codigo: 1, nome: 1 }).lean();
    const lista = (docs || [])
      .map(d => (d?.codigo || d?.nome || '').toString().trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return res.status(200).json(lista);
  } catch (err) {
    console.error('GET /api/filiais/codigos erro:', err?.message || err);
    // retorna [] para não travar tela
    res.setHeader('X-Error', 'filiais-codigos-failed');
    return res.status(200).json([]);
  }
}
