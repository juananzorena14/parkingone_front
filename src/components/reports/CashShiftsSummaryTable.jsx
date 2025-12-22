import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export default function CashShiftsSummaryTable({ title = 'Resumen de turnos (caja)' }) {
  const [items, setItems] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await api(`/api/cash-shifts/summary?${qs.toString()}`);
      setItems(res.data || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3 shadow-md">
      <div className="flex items-end gap-2 flex-wrap justify-between">
        <div className="font-semibold">{title}</div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-gray-500">Desde</label>
            <input
              type="date"
              className="block w-40 rounded-lg border p-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              className="block w-40 rounded-lg border p-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            onClick={load}
            className="px-3 py-2 rounded-lg border bg-white"
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Aplicar'}
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Abierto</th>
              <th className="p-2 text-left">Cerrado</th>
              <th className="p-2 text-right">Entrada</th>
              <th className="p-2 text-right">Efectivo cobrado</th>
              <th className="p-2 text-right">Esperado</th>
              <th className="p-2 text-right">Cierre</th>
              <th className="p-2 text-right">Dif</th>
              <th className="p-2 text-left">OK</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">
                  <div className="font-medium">{s.userName || `#${s.userId}`}</div>
                  <div className="text-xs text-gray-500">{s.userRole}</div>
                </td>
                <td className="p-2">{s.openedAt ? new Date(s.openedAt).toLocaleString() : '-'}</td>
                <td className="p-2">{s.closedAt ? new Date(s.closedAt).toLocaleString() : <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800">ABIERTO</span>}</td>
                <td className="p-2 text-right">{fmt.format(s.openingCash || 0)}</td>
                <td className="p-2 text-right">{fmt.format(s.paymentsCashNet || 0)}</td>
                <td className="p-2 text-right">{fmt.format(s.expectedAtClose || 0)}</td>
                <td className="p-2 text-right">{s.closingCash == null ? '-' : fmt.format(s.closingCash)}</td>
                <td className="p-2 text-right">{s.diff == null ? '-' : fmt.format(s.diff)}</td>
                <td className="p-2">
                  {s.ok == null ? (
                    '-'
                  ) : s.ok ? (
                    <span className="text-xs px-2 py-1 rounded-lg bg-green-100 text-green-800">OK</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-800">NO</span>
                  )}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-3 text-gray-500" colSpan={9}>
                  Sin turnos para el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
