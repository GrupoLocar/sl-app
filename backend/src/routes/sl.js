import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import requireAuth from '../middleware/requireAuth.js';
import SL from '../models/SL.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, Date.now() + '_' + safe);
  }
});
const upload = multer({ storage });

// LISTA
router.get('/', requireAuth, async (req,res)=>{
  const { filial } = req.query;
  const q = filial ? { filial } : {};
  const list = await SL.find(q).sort({ opened_at:-1 });
  res.json(list);
});

// ESTATÍSTICAS
router.get('/stats', requireAuth, async (req,res)=>{
  const { filial } = req.query;
  const q = filial ? { filial } : {};
  const pipeline = [
    { $match: q },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ];
  const rows = await SL.aggregate(pipeline);
  const map = { 'Aberta':0, 'Em andamento':0, 'Finalizada':0 };
  rows.forEach(r=> map[r._id]=r.count);
  res.json(map);
});

// CRIAR
router.post('/', requireAuth, async (req,res)=>{
  const { sl_number, priority=false, filial, plate, tipo_lavagem } = req.body;

  // placa: 7 alfanuméricos e pelo menos 3 letras
  const plateUp = (plate || '').toUpperCase();
  if (!/^(?=(?:.*[A-Z]){3,})[A-Z0-9]{7}$/.test(plateUp)) {
    return res.status(400).json({ error: 'invalid_plate' });
  }

  const item = await SL.create({
    sl_number: sl_number || null,
    priority: !!priority,
    filial,
    plate: plateUp,
    tipo_lavagem,
    // opened_at default no schema
    status: 'Aberta',
    created_by: req.user.uid
  });
  res.json(item);
});

// INICIAR
router.patch('/:id/start', requireAuth, async (req,res)=>{
  const sl = await SL.findById(req.params.id);
  if(!sl) return res.status(404).json({error:'not_found'});
  if(sl.status === 'Aberta'){
    sl.status = 'Em andamento';
    await sl.save();
  }
  res.json(sl);
});

// UPLOAD FOTOS (opcional)
router.post('/:id/upload', requireAuth, upload.fields([{name:'antes'},{name:'depois'}]), async (req,res)=>{
  const sl = await SL.findById(req.params.id);
  if(!sl) return res.status(404).json({error:'not_found'});
  if(!sl.fotos) sl.fotos = {};
  if(req.files?.antes?.[0]) sl.fotos.antes_url = '/uploads/' + path.basename(req.files.antes[0].path);
  if(req.files?.depois?.[0]) sl.fotos.depois_url = '/uploads/' + path.basename(req.files.depois[0].path);
  await sl.save();
  res.json(sl);
});

// FINALIZAR (NÃO exige fotos)
router.patch('/:id/finish', requireAuth, async (req,res)=>{
  const sl = await SL.findById(req.params.id);
  if(!sl) return res.status(404).json({error:'not_found'});
  sl.status = 'Finalizada';
  if (!sl.closed_at) sl.closed_at = new Date();
  await sl.save();
  res.json(sl);
});

// UPDATE GENÉRICO (fallback)
router.patch('/:id', requireAuth, async (req,res)=>{
  const { status, closed_at, filial, plate, tipo_lavagem, priority } = req.body;
  const sl = await SL.findById(req.params.id);
  if(!sl) return res.status(404).json({error:'not_found'});

  if (status) sl.status = status;
  if (closed_at) sl.closed_at = new Date(closed_at);
  if (filial) sl.filial = filial;
  if (typeof priority === 'boolean') sl.priority = priority;
  if (tipo_lavagem) sl.tipo_lavagem = tipo_lavagem;
  if (plate) {
    const up = String(plate).toUpperCase();
    if (!/^(?=(?:.*[A-Z]){3,})[A-Z0-9]{7}$/.test(up)) {
      return res.status(400).json({ error: 'invalid_plate' });
    }
    sl.plate = up;
  }

  await sl.save();
  res.json(sl);
});

/* === NOVA ROTA: DELETE /:id ===
   Exclusão física do documento SL no MongoDB.
   Mantém consistência com o endpoint que o frontend já tenta chamar. */
router.delete('/:id', requireAuth, async (req, res) => {
  const sl = await SL.findByIdAndDelete(req.params.id);
  if (!sl) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true, id: req.params.id });
});

export default router;
