import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

// register (primeiro acesso)
router.post('/register', async (req,res)=>{
  try{
    const { name, email, phone, password, filiais=[] } = req.body;
    if(!name || !email || !password) return res.status(400).json({error:'missing_fields'});
    const exists = await User.findOne({ email: email.toLowerCase() });
    if(exists) return res.status(409).json({error:'email_in_use'});
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), phone, password_hash, filiais });
    return res.json({ ok:true, user: { id: user._id, name: user.name, email: user.email } });
  }catch(e){ res.status(500).json({error:e.message});}
});

// login
router.post('/login', async (req,res)=>{
  try{
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email||'').toLowerCase() });
    if(!user) return res.status(401).json({error:'invalid_credentials'});
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({error:'invalid_credentials'});
    const token = jwt.sign({ uid:user._id, name:user.name, email:user.email, filiais:user.filiais }, process.env.JWT_SECRET, { expiresIn:'8h' });
    res.json({ token, user:{ id:user._id, name:user.name, email:user.email, filiais:user.filiais } });
  }catch(e){ res.status(500).json({error:e.message});}
});

// forgot: (demo) apenas retorna um link de reset (sem e-mail real)
router.post('/forgot', async (req,res)=>{
  const { email } = req.body;
  const user = await User.findOne({ email: (email||'').toLowerCase() });
  if(!user) return res.json({ ok:true, info:'if_exists' });
  const token = jwt.sign({ uid:user._id }, process.env.JWT_SECRET, { expiresIn:'15m' });
  // link para reset (frontend rota #/reset/<token>)
  return res.json({ ok:true, reset_url:`#/reset/${token}` });
});

router.post('/reset', async (req,res)=>{
  try{
    const { token, password } = req.body;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const password_hash = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(payload.uid, { password_hash });
    res.json({ ok:true });
  }catch(e){ res.status(400).json({error:'invalid_or_expired'});}
});

export default router;
