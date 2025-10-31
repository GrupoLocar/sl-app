export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Mock mínimo; se quiser, parseie req.headers.authorization aqui
  return res.status(200).json({
    user: {
      name: 'Higienizador',
      role: 'user',
      filiais: [], // vazio => lista completa virá de /filiais/codigos
    }
  });
}
