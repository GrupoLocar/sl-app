// src/services/api.js (ou onde você mantém este arquivo)
import axios from 'axios';

// VITE_API_BASE_URL=http://localhost:8080

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL, // em produção na Vercel, cai em '/api' (mesmo domínio)
});

export default api;
