import { API } from '@/lib/api';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function normalizeApiUrl(path) {
  if (/^https?:\/\//i.test(String(path || ''))) return String(path);
  const p = String(path || '');
  const withSlash = p.startsWith('/') ? p : `/${p}`;
  if (withSlash.startsWith('/api/')) return `${API}${withSlash}`;
  if (withSlash.startsWith('/public/')) return `${API}${withSlash}`;
  return `${API}/api${withSlash}`;
}

function filenameFromContentDisposition(cd) {
  if (!cd) return null;
  // filename*=UTF-8''...
  const m1 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (m1?.[1]) {
    try { return decodeURIComponent(m1[1]); } catch { return m1[1]; }
  }
  const m2 = /filename="?([^";]+)"?/i.exec(cd);
  return m2?.[1] || null;
}

export async function downloadFile(path, fallbackFilename = 'export.csv') {
  const token = getToken();
  const url = normalizeApiUrl(path);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (res.status === 401) {
    throw new Error('No autorizado');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[${res.status}] ${text.slice(0, 200)}`);
  }

  const truncated = res.headers.get('x-export-truncated') === '1';
  const maxRows = Number(res.headers.get('x-export-max-rows') || 0) || null;

  const blob = await res.blob();
  const cd = res.headers.get('content-disposition');
  const filename = filenameFromContentDisposition(cd) || fallbackFilename;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objUrl);

  return { filename, truncated, maxRows };
}
