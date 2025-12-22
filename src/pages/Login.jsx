import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { Eye, EyeClosed } from 'lucide-react';

function isEmail(x){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x); }

export default function Login(){
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('Juananzorena1234');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuth(s => s.setAuth);

  // Si ya hay token, redirige a /
  useEffect(()=>{
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) window.location.replace('/');
  },[]);

  async function submit(e){
    e.preventDefault();
    setErr('');

    // Validación mínima
    if (!email || !password) return setErr('Completá email y contraseña.');
    if (!isEmail(email)) return setErr('Email inválido.');

    try{
      setLoading(true);

      const res = await fetch(`${API}/api/auth/login`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        // 401 = credenciales; otros = backend down, CORS, etc.
        const msg = data?.error || (res.status === 401 ? 'Credenciales inválidas.' : `Error ${res.status}`);
        throw new Error(msg);
      }

      // // Persistencia según "Recordarme"
      // const storage = remember ? localStorage : sessionStorage;
      // storage.setItem('token', data.token);
      // storage.setItem('user', JSON.stringify(data.user));

      setAuth({user:data.user, token: data.token, remember});

      // precarga datos globales para que todo esté listo al entrar
      // await fetchRateplans({ force: true });

      // Limpiar el otro storage por si quedó algo
      (remember ? sessionStorage : localStorage).removeItem('token');
      (remember ? sessionStorage : localStorage).removeItem('user');

      window.location.href = '/';
    }catch(e){
      setErr(String(e.message || e));
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl  shadow-md p-6 space-y-4">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>

        {err && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2">{err}</div>}

        <div>
          <label className="text-sm">Email</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            disabled={loading}
          />
        </div>

        <div>
          <label className="text-sm">Contraseña</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-lg border p-2"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={()=>setShowPw(s=>!s)}
              className="px-3 py-2 rounded-lg border bg-white"
              disabled={loading}
              title={showPw ? 'Ocultar' : 'Mostrar'}
            >
              {showPw ? <Eye/> : <EyeClosed/>  }
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={e=>setRemember(e.target.checked)}
              disabled={loading}
            />
            Recordarme
          </label>
          {/* Placeholder para “Olvidé mi contraseña” */}
          <button type="button" className="text-sm text-gray-600 hover:underline" onClick={()=>alert('Funcionalidad próximamente.')}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button
          className={`w-full px-3 py-2 rounded-lg border bg-gray-900 text-white flex items-center justify-center ${loading?'opacity-70 cursor-not-allowed':''}`}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
              Entrando...
            </span>
          ) : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
