import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import User from './src/models/User.js';
import SL from './src/models/SL.js';

const MONGO_URI = process.env.MONGO_URI;
await mongoose.connect(MONGO_URI, { dbName:'SL' });

const filiais = JSON.parse(fs.readFileSync(path.join(process.cwd(),'filiais.json'),'utf-8')).map(x=>x.Filial);

// cria usuário admin
const email = 'ti@grupolocar.com';
let user = await User.findOne({ email });
if(!user){
  const password_hash = await bcrypt.hash('Admin123',10);
  user = await User.create({ name:'Admin', email, phone:'(21)97476-3763', password_hash, filiais: filiais.slice(0, 12) });
}

// apaga SLs existentes e cria 30
await SL.deleteMany({});
function randomPlate(){
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({length:3},(_,i)=>letters[Math.floor(Math.random()*letters.length)]).join('')
    + Math.floor(Math.random()*10)
    + letters[Math.floor(Math.random()*letters.length)]
    + String(Math.floor(Math.random()*100)).padStart(2,'0');
}
const tipos = ['LAVAGEM SIMPLES','LAVAGEM SIMPLES (Jato)','LAVAGEM ESPECIAL'];
const now = new Date();
const docs = [];
for(let i=0;i<30;i++){
  const opened = new Date(now.getTime() - Math.floor(Math.random()*7*24*3600*1000));
  const statusIdx = i%3; // alterna estados
  const status = ['Aberta','Em andamento','Finalizada'][statusIdx];
  const doc = {
    sl_number: String(22158952 + i),
    priority: Math.random()<0.3,
    filial: filiais[i % filiais.length],
    plate: randomPlate(),
    tipo_lavagem: tipos[i%tipos.length],
    opened_at: opened,
    status,
    created_by: user._id
  };
  if(status === 'Finalizada'){
    doc.closed_at = new Date(opened.getTime()+ 20*60*1000 + Math.floor(Math.random()*30*60*1000));
  }
  docs.push(doc);
}
await SL.insertMany(docs);
console.log('Seed ok:', { admin_email: email, password:'Admin123', total: docs.length });
process.exit(0);
