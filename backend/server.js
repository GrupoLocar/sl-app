import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.js';
import slRoutes from './src/routes/sl.js';
import metaRoutes from './src/routes/meta.js';
import filiaisRoutes from './src/routes/filiais.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({limit:'10mb'}));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req,res)=>res.json({ok:true, service:'sl-backend'}));

app.use('/api/auth', authRoutes);
app.use('/api/sl', slRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/filiais', filiaisRoutes);

const PORT = process.env.PORT || 8080;
mongoose.connect(process.env.MONGO_URI, { dbName: 'SL' })
  .then(()=>{
    app.listen(PORT, ()=>console.log('API on :'+PORT));
  })
  .catch(err=>{
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  });
