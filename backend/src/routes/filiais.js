// backend/src/routes/filiais.js
import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import Filial from '../models/Filial.js';

const router = Router();

// Lista completa (opcional: ?filial=ACNIT)
router.get('/', requireAuth, async (req, res) => {
  const { filial } = req.query;
  const q = filial ? { filial: String(filial).toUpperCase() } : {};
  const list = await Filial.find(q).sort({ filial: 1 });
  res.json(list);
});

// Somente as siglas (para o select do Dashboard)
router.get('/codigos', requireAuth, async (_req, res) => {
  const rows = await Filial.find({}, { filial: 1, _id: 0 }).sort({ filial: 1 });
  res.json(rows.map(r => r.filial));
});

export default router;
