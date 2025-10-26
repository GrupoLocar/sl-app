import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import fs from 'fs';

const router = Router();

router.get('/filiais', requireAuth, async (req,res)=>{
  try{
    const raw = fs.readFileSync('./filiais.json', 'utf-8');
    const list = JSON.parse(raw);
    res.json(list.map(x=>x.Filial));
  }catch(e){
    res.json([]);
  }
});

router.get('/me', requireAuth, (req,res)=>{
  res.json(req.user);
});

export default router;
