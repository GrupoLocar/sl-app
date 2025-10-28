# SL-app Lavacar (Solicitação de Lavagem)

MERN (MongoDB, Express, React, Node) demo, pronto para hospedar **frontend no GitHub Pages** e **API em Vercel/Render/Railway**.

- Frontend: React + Vite + HashRouter (compatível com GitHub Pages).
- Backend: Node + Express + MongoDB (Atlas).
- Upload de fotos (antes/depois) usando `multipart/form-data` via `multer` (armazenamento local de exemplo: `backend/uploads/`).

## Passos rápidos

1. **Backend** (Node 18+):
   - Crie `.env` baseado em `.env.example`.
   - `cd backend && npm i && npm run dev` (dev) ou `npm start` (prod).
   - Rode `npm run seed` para criar usuário Admin e 30 SLs de teste.

2. **Frontend**:
   - Ajuste `VITE_API_BASE_URL` em `frontend/.env`.
   - `cd frontend && npm i && npm run dev` (dev).
   - Para GitHub Pages: `npm run build` e publique a pasta `dist/`.
     - Configure `vite.config.js` com `base: '/<repo>/'` se o repositório **não** for `username.github.io`.

> Campos e coleções SEM acentos/ç.
