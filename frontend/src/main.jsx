import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- FETCH POLYFILL ---
// Intercepta todas las llamadas fetch nativas (módulos legacy) para inyectar X-Business-Id
// de forma automática, al igual que lo hace api.js.
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.includes('/api/')) {
    init = init || {};
    init.headers = init.headers || {};
    const storedBusiness = localStorage.getItem('selectedBusiness');
    if (storedBusiness) {
      try {
        const parsed = JSON.parse(storedBusiness);
        if (!init.headers['X-Business-Id']) {
          init.headers['X-Business-Id'] = parsed.id;
        }
      } catch (e) {
        console.error('Error parseando selectedBusiness en fetch polyfill');
      }
    }
  }
  
  const res = await originalFetch(input, init);
  
  // Manejo global de expiración de sesión y permisos (igual que api.js)
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('selectedBusiness');
    window.location.href = '/';
  } else if (res.status === 403 && window.location.pathname.startsWith('/admin')) {
    localStorage.removeItem('selectedBusiness');
    window.location.href = '/businesses';
  }
  
  return res;
};
// ----------------------

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
