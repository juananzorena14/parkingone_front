export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function normalizeApiUrl(path) {
  // Full URLs pass-through (useful for downloads / external services)
  if (/^https?:\/\//i.test(String(path || ''))) return String(path);

  const p = String(path || '');
  const withSlash = p.startsWith('/') ? p : `/${p}`;

  // Allow explicitly-scoped paths (back-compat)
  if (withSlash.startsWith('/api/')) return `${API}${withSlash}`;
  if (withSlash.startsWith('/public/')) return `${API}${withSlash}`;

  // Default: everything is served under /api
  return `${API}/api${withSlash}`;
}

export async function api(path, opts = {}) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const url = normalizeApiUrl(path);
  const res = await fetch(url, { ...opts, headers });

  const text = await res.text();
  const ctype = res.headers.get('content-type') || '';

  if (res.status === 401) {
    // limpiar sesión y redirigir
    localStorage.removeItem('token'); localStorage.removeItem('user');
    sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
    if (!location.pathname.startsWith('/login')) {
      location.href = '/login';
    }
    throw new Error('No autorizado');
  }
  if (!res.ok) throw new Error(`[${res.status}] ${text.slice(0,200)}`);

  return ctype.includes('application/json') ? JSON.parse(text) : text;
}
