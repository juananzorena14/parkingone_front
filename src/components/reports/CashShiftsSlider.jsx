import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

function fmtDuration(minutes) {
  const m = Math.max(0, Math.floor(Number(minutes || 0)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm <= 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

export default function CashShiftsSlider({ title = 'Turnos' }) {
  const navigate = useNavigate();
  const scrollerRef = useRef(null);

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

  function scrollByCards(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(240, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3 shadow-md">
      <div className="flex items-end gap-2 flex-wrap justify-between">
        <div className="space-y-1">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-gray-500">Click en un turno para ver el detalle</div>
        </div>

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
          <button onClick={load} className="px-3 py-2 rounded-lg border bg-white" disabled={loading}>
            {loading ? 'Cargando…' : 'Aplicar'}
          </button>

          <div className="flex gap-1">
            <button
              type="button"
              className="p-2 rounded-lg border bg-white"
              onClick={() => scrollByCards(-1)}
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg border bg-white"
              onClick={() => scrollByCards(1)}
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
      >
        {items.map((s) => {
          const openedAt = s.openedAt ? dayjs(s.openedAt) : null;
          const closedAt = s.closedAt ? dayjs(s.closedAt) : null;
          const durationMin = openedAt ? (closedAt || dayjs()).diff(openedAt, 'minute') : 0;

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => navigate(`/reports/shifts/${s.id}`)}
              className="snap-start min-w-[280px] max-w-[320px] text-left rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold leading-tight">{s.userName || `#${s.userId}`}</div>
                  <div className="text-xs text-gray-500">{s.userRole || '-'}</div>
                </div>
                <div>
                  {s.closedAt ? (
                    <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700">CERRADO</span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800">ABIERTO</span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Duración</div>
                  <div className="font-medium">{fmtDuration(durationMin)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Dif</div>
                  <div className="font-medium">
                    {s.diff == null ? '-' : fmt.format(s.diff)}
                    {s.ok != null && (
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-lg ${s.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {s.ok ? 'OK' : 'NO'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Horario</div>
                  <div className="text-sm">
                    {s.openedAt ? new Date(s.openedAt).toLocaleString() : '-'}
                    {'  —  '}
                    {s.closedAt ? new Date(s.closedAt).toLocaleString() : 'Ahora'}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-gray-500">Entrada</div>
                  <div className="font-medium">{fmt.format(s.openingCash || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Efectivo cobrado</div>
                  <div className="font-medium">{fmt.format(s.paymentsCashNet || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Esperado</div>
                  <div className="font-medium">{fmt.format(s.expectedAtClose || 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Cierre</div>
                  <div className="font-medium">{s.closingCash == null ? '-' : fmt.format(s.closingCash)}</div>
                </div>
              </div>
            </button>
          );
        })}

        {!items.length && (
          <div className="text-sm text-gray-500 p-3">Sin turnos para el filtro.</div>
        )}
      </div>
    </div>
  );
}
