import axios from 'axios'

function isLocalhostHost() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')
}

const envBase = import.meta.env?.VITE_API_BASE_URL
let baseURL = '/api'

// Se VITE_API_BASE_URL existir:
if (envBase) {
  // Se for localhost mas estamos em produção, ignore e use '/api'
  const isLocalEnvBase = /localhost|127\.0\.0\.1/.test(envBase)
  if (!isLocalhostHost() && isLocalEnvBase) {
    baseURL = '/api'
  } else {
    baseURL = envBase
  }
} else {
  // Sem env definida:
  if (isLocalhostHost()) {
    // Em dev sem vercel dev, aponte para a API já publicada
    baseURL = 'https://sl-app-one.vercel.app/api'
  } else {
    // Em produção, mesma origem
    baseURL = '/api'
  }
}

const api = axios.create({ baseURL })
export default api
