import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export default function PaymentsTable({ title = 'Pagos recientes', subscriberId = null }) {
  const [items, setItems] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }),
    []
  );

  async function load(){
    setErr('');
    setLoading(true);
    try{
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to)   qs.set('to', to);
      if (method && method !== 'ALL') qs.set('method', method);
      if (subscriberId) qs.set('subscriberId', subscriberId);
      qs.set('limit', '100');

      const res = await api(`/payments?${qs.toString()}`);
      setItems(res.data || res);
    }catch(e){
      setErr(String(e.message || e));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load() }, []); // primera carga

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3 mt-10">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-gray-500">Desde</label>
            <input type="date" className="block w-40 rounded-lg border p-2" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Hasta</label>
            <input type="date" className="block w-40 rounded-lg border p-2" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Método</label>
            <select className="block w-40 rounded-lg border p-2 bg-white" value={method} onChange={e=>setMethod(e.target.value)}>
              <option value="ALL">Todos</option>
              <option value="CASH">Efectivo</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
              <option value="MP">Mercado Pago</option>
              <option value="SUBSCRIPTION">Suscripción</option>
            </select>
          </div>
          <button onClick={load} className="px-3 py-2 rounded-lg border bg-white">{loading ? 'Cargando…' : 'Aplicar'}</button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Referencia</th>
              <th className="p-2 text-left">Método</th>
              <th className="p-2 text-right">Monto</th>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Nota</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    p.kind==='SUBSCRIPTION' ? 'bg-amber-100 text-amber-800' :
                    p.kind==='TICKET' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {p.kind==='SUBSCRIPTION' ? 'Suscripción' : p.kind==='TICKET' ? 'Ticket' : 'Otro'}
                  </span>
                </td>
                <td className="p-2">{p.ref || '-'}</td>
                <td className="p-2">{p.method}</td>
                <td className="p-2 text-right">{fmt.format(p.amount || 0)}</td>
                <td className="p-2">{p.userName || p.createdBy || '-'}</td>
                <td className="p-2">{p.note || '-'}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td className="p-3 text-gray-500" colSpan={7}>Sin pagos para el filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
