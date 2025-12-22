import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import KpiCard from '@/components/KpiCard';
import CashShiftsSlider from '@/components/reports/CashShiftsSlider';
import PaymentsTableServer from '@/components/reports/PaymentsTableServer';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, Tooltip
} from 'recharts';
import { downloadFile } from '@/lib/download';

const METHODS = [
  { value: 'ALL',    label: 'Todos' },
  { value: 'CASH',   label: 'Efectivo' },
  { value: 'DEBIT',  label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function addDays(iso, delta) {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

/* ===================== Custom Tooltips ===================== */

function TooltipBox({ children }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg">
      {children}
    </div>
  );
}

// Barras (por método)
function MethodTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload; // { method, total, count }
  return (
    <TooltipBox>
      <div className="font-medium mb-1">Método: {p.method}</div>
      <div>Total: <b>{fmt.format(p.total || 0)}</b></div>
      <div>Cantidad: <b>{p.count ?? 0}</b></div>
    </TooltipBox>
  );
}

// Línea (diario)
function DailyTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload; // { date, total, count }
  return (
    <TooltipBox>
      <div className="font-medium mb-1">{p.date}</div>
      <div>Total: <b>{fmt.format(p.total || 0)}</b></div>
      <div>Cantidad: <b>{p.count ?? 0}</b></div>
    </TooltipBox>
  );
}

// Pie (donut)
function PieTooltip({ active, payload, fmt }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p?.name;  // método
  const val  = p?.value; // total
  const pct  = p?.percent; // 0..1
  return (
    <TooltipBox>
      <div className="font-medium mb-1">{name}</div>
      <div>Total: <b>{fmt.format(val || 0)}</b></div>
      <div>Porcentaje: <b>{(pct * 100).toFixed(1)}%</b></div>
    </TooltipBox>
  );
}

/* ===================== Main ===================== */

export default function Reports(){
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') || 'payments').toLowerCase();

  const [from, setFrom] = useState(todayISO());
  const [to, setTo]     = useState(todayISO());
  const [method, setMethod] = useState('ALL');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [summary, setSummary]   = useState({ total: 0, count: 0, avgTicket: 0, avgMinutes: 0 });
  const [byMethod, setByMethod] = useState([]);
  const [daily, setDaily]       = useState([]);

  // Exportaciones
  const [exportKind, setExportKind] = useState('PAYMENTS'); // PAYMENTS | SHIFTS_SUMMARY | SHIFT_DETAIL
  const [expFrom, setExpFrom] = useState(todayISO());
  const [expTo, setExpTo] = useState(todayISO());
  const [expMethod, setExpMethod] = useState('ALL');
  const [expType, setExpType] = useState('ALL');
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  // Buscar turno por usuario + rango
  const [shiftUserQ, setShiftUserQ] = useState('');
  const [shiftOptions, setShiftOptions] = useState([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftId, setShiftId] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );
  const compact = useMemo(
    () => new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }),
    []
  );

  const qsWithMethod = useMemo(() => `?from=${from}&to=${to}&method=${method}`, [from, to, method]);
  const qsNoMethod   = useMemo(() => `?from=${from}&to=${to}`, [from, to]);

  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  async function load(){
    if (new Date(from) > new Date(to)) {
      setError('El rango de fechas es inválido (Desde > Hasta).');
      setSummary({ total: 0, count: 0, avgTicket: 0, avgMinutes: 0 });
      setByMethod([]); setDaily([]);
      return;
    }
    setError('');
    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const [s, m, d] = await Promise.all([
        api(`/reports/payments/summary${qsWithMethod}`, { signal: ac.signal }).catch(() => null),
        api(`/reports/payments/by-method${qsNoMethod}`, { signal: ac.signal }).catch(() => null),
        api(`/reports/payments/daily${qsWithMethod}`, { signal: ac.signal }).catch(() => null),
      ]);
      setSummary(s || { total: 0, count: 0, avgTicket: 0, avgMinutes: 0 });
      setByMethod(m || []);
      setDaily(d || []);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(load, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, method]);

  function onApply(e){
    e?.preventDefault();
    load();
  }

  function setRange(days){
    const end = todayISO();
    const start = days === 0 ? end : addDays(end, -days+1);
    setFrom(start); setTo(end);
  }

  
  function setTab(next) {
    const sp = new URLSearchParams(searchParams);
    sp.set('tab', next);
    setSearchParams(sp, { replace: true });
  }

  async function loadShiftOptions() {
    setError('');
    setNotice('');
    setShiftLoading(true);
    try {
      const qs = new URLSearchParams();
      if (expFrom) qs.set('from', expFrom);
      if (expTo) qs.set('to', expTo);
      const res = await api(`/api/cash-shifts/summary?${qs.toString()}`);
      const list0 = res?.data || [];
      const q = String(shiftUserQ || '').trim().toLowerCase();
      const list = q
        ? list0.filter((s) => String(s.userName || '').toLowerCase().includes(q))
        : list0;
      setShiftOptions(list);
      if (list.length && !shiftId) setShiftId(String(list[0].id));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setShiftLoading(false);
    }
  }

  async function runExport(path, fallbackFilename) {
    setError('');
    setNotice('');
    setExporting(true);
    try {
      const { filename, truncated, maxRows } = await downloadFile(path, fallbackFilename);
      if (truncated) {
        setError(`La exportación fue truncada (máx ${maxRows || 'N/A'} filas). Ajustá filtros y reintentá.`);
      }
      setNotice(`Descarga iniciada: ${filename}`);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  async function exportPayments() {
    if (new Date(expFrom) > new Date(expTo)) {
      setError('El rango de fechas es inválido (Desde > Hasta).');
      return;
    }
    const qs = new URLSearchParams();
    if (expFrom) qs.set('from', expFrom);
    if (expTo) qs.set('to', expTo);
    if (expMethod && expMethod !== 'ALL') qs.set('method', expMethod);
    if (expType && expType !== 'ALL') qs.set('type', expType);

    await runExport(`/payments/export?${qs.toString()}`, 'movimientos.csv');
  }

  async function exportShiftsSummary() {
    if (new Date(expFrom) > new Date(expTo)) {
      setError('El rango de fechas es inválido (Desde > Hasta).');
      return;
    }
    const qs = new URLSearchParams();
    if (expFrom) qs.set('from', expFrom);
    if (expTo) qs.set('to', expTo);

    await runExport(`/cash-shifts/summary/export?${qs.toString()}`, 'turnos.csv');
  }

  async function exportShiftDetail() {
    const id = Number(shiftId);
    if (!id) {
      setError('Seleccioná un turno.');
      return;
    }
    await runExport(`/cash-shifts/${id}/export`, `turno_${id}.csv`);
  }

  function shiftOptionLabel(s) {
    const opened = s?.openedAt ? new Date(s.openedAt).toLocaleString('es-AR') : '';
    const closed = s?.closedAt ? new Date(s.closedAt).toLocaleString('es-AR') : '';
    const status = s?.closedAt ? 'Cerrado' : 'Abierto';
    return `#${s.id} · ${s.userName || ''} · ${opened}${closed ? ` → ${closed}` : ''} · ${status}`;
  }

  const tabBtnBase = 'px-3 py-2 rounded-xl text-sm border transition';
  const tabActive = 'bg-gray-900 text-white border-gray-900';
  const tabIdle = 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`${tabBtnBase} ${tab === 'payments' ? tabActive : tabIdle}`}
          >
            Pagos
          </button>
          <button
            type="button"
            onClick={() => setTab('movements')}
            className={`${tabBtnBase} ${tab === 'movements' ? tabActive : tabIdle}`}
          >
            Turnos / movimientos
          </button>
          <button
            type="button"
            onClick={() => setTab('exports')}
            className={`${tabBtnBase} ${tab === 'exports' ? tabActive : tabIdle}`}
          >
            Exportaciones
          </button>
        </div>
      </div>

      {tab === 'payments' && (
        <>
          {/* Filtros */}
          <form onSubmit={onApply} className="rounded-2xl bg-white p-4 shadow-md flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Desde</label>
          <input type="date" className="block w-40 rounded-xl shadow-md border-gray-500 p-2" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Hasta</label>
          <input type="date" className="block w-40 rounded-xl shadow-md border-gray-500 p-2" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500">Método</label>
          <select className="block w-48 rounded-xl shadow-md p-2 bg-white" value={method} onChange={e=>setMethod(e.target.value)}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* rangos rápidos */}
        <div className="flex gap-2 flex-col">
          <label className="text-xs text-gray-500">Períodos</label>
          <div className='gap-3 flex'>
            <button type="button" onClick={()=>setRange(0)}  className="p-2 rounded-xl shadow-md bg-white text-md">Hoy</button>
            <button type="button" onClick={()=>setRange(7)}  className="p-2 rounded-xl shadow-md bg-white text-md">7 días</button>
            <button type="button" onClick={()=>setRange(30)} className="p-2 rounded-xl shadow-md bg-white text-md">30 días</button>
          </div>
        </div>

        <button
          type="submit"
          className={`px-3 py-2 rounded-xl border shadow bg-gray-900 text-white ${loading?'opacity-70 cursor-not-allowed':''}`}
          disabled={loading}
        >
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </form>

      {/* Errores */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total recaudado" value={fmt.format(summary.total || 0)} />
        <KpiCard label="Tickets cerrados" value={summary.count || 0} />
        <KpiCard label="Promedio por ticket" value={fmt.format(summary.avgTicket || 0)} />
        <KpiCard label="Tiempo promedio" value={`${Math.round(summary.avgMinutes || 0)} min`} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Barras por método */}
        <div className="rounded-2xl shadow-md bg-white p-4">
          <div className="text-sm font-medium mb-2">Recaudación por método</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMethod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis tickFormatter={(v)=>compact.format(v)} />
                <Tooltip content={<MethodTooltip fmt={fmt} />} />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Línea evolución diaria */}
        <div className="rounded-2xl shadow-md bg-white p-4">
          <div className="text-sm font-medium mb-2">Evolución diaria</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(v)=>compact.format(v)} />
                <Tooltip content={<DailyTooltip fmt={fmt} />} />
                <Line type="monotone" dataKey="total" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut distribución por método */}
        <div className="rounded-2xl bg-white p-4 shadow-md lg:col-span-2">
          <div className="text-sm font-medium mb-2">Distribución por método</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byMethod}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label
                >
                  {byMethod.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip fmt={fmt} />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla simple */}
      <div className="rounded-2xl shadow-md bg-white p-4">
        <div className="text-sm font-medium mb-3">Detalle por método</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Método</th>
                <th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byMethod.map(r => (
                <tr key={r.method} className="border-t">
                  <td className="p-2">{r.method}</td>
                  <td className="p-2 text-right">{r.count ?? 0}</td>
                  <td className="p-2 text-right">{fmt.format(r.total ?? 0)}</td>
                </tr>
              ))}
              {!byMethod.length && (
                <tr><td className="p-3 text-gray-500" colSpan={3}>Sin datos para el rango filtrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && !error && !byMethod.length && summary.total === 0 && (
        <div className="text-xs text-gray-500">
          Tip: cuando implementemos <code>/reports/payments/*</code> en el backend, este panel se completa automáticamente.
        </div>
      )}
        </>
      )}

      {tab === 'movements' && (
        <div className="space-y-4">
          <CashShiftsSlider title="Resumen de turnos (caja)" />
          <PaymentsTableServer initialPage={1} pageSize={20} />
        </div>
      )}

      {tab === 'exports' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Exportaciones</div>
                <div className="text-xs text-gray-500">Todas las exportaciones CSV se centralizan acá.</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Tipo</label>
                <select
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                  value={exportKind}
                  onChange={(e) => {
                    setExportKind(e.target.value);
                    setError('');
                    setNotice('');
                  }}
                >
                  <option value="PAYMENTS">Pagos (detalle)</option>
                  <option value="SHIFTS_SUMMARY">Turnos (resumen)</option>
                  <option value="SHIFT_DETAIL">Turno (detalle)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500">Desde</label>
                <input
                  type="date"
                  className="block w-full rounded-xl border border-gray-200 p-2"
                  value={expFrom}
                  onChange={(e) => setExpFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Hasta</label>
                <input
                  type="date"
                  className="block w-full rounded-xl border border-gray-200 p-2"
                  value={expTo}
                  onChange={(e) => setExpTo(e.target.value)}
                />
              </div>

              {exportKind === 'PAYMENTS' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500">Método</label>
                    <select
                      className="block w-full rounded-xl border border-gray-200 bg-white p-2"
                      value={expMethod}
                      onChange={(e) => setExpMethod(e.target.value)}
                    >
                      {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Tipo</label>
                    <select
                      className="block w-full rounded-xl border border-gray-200 bg-white p-2"
                      value={expType}
                      onChange={(e) => setExpType(e.target.value)}
                    >
                      <option value="ALL">Todos</option>
                      <option value="TICKET">Ticket</option>
                      <option value="SUBSCRIPTION">Abonado</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </div>
                </>
              )}

              {exportKind !== 'PAYMENTS' && (
                <div className="sm:col-span-2 lg:col-span-2 text-xs text-gray-500 flex items-end">
                  El rango filtra por fecha de apertura del turno.
                </div>
              )}
            </div>

            {exportKind === 'SHIFT_DETAIL' && (
              <div className="rounded-xl border border-gray-200 p-3 space-y-3">
                <div className="text-sm font-medium">Buscar turno</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-gray-500">Usuario (nombre)</label>
                    <input
                      className="block w-full rounded-xl border border-gray-200 p-2"
                      placeholder="Ej: Juan"
                      value={shiftUserQ}
                      onChange={(e) => setShiftUserQ(e.target.value)}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={loadShiftOptions}
                      className={`w-full rounded-xl bg-gray-900 px-3 py-2 text-sm text-white ${shiftLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      disabled={shiftLoading}
                    >
                      {shiftLoading ? 'Buscando…' : 'Buscar turnos'}
                    </button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Turno</label>
                    <select
                      className="block w-full rounded-xl border border-gray-200 bg-white p-2"
                      value={shiftId}
                      onChange={(e) => setShiftId(e.target.value)}
                      disabled={shiftLoading}
                    >
                      {!shiftOptions.length && <option value="">(sin resultados)</option>}
                      {shiftOptions.map(s => (
                        <option key={s.id} value={String(s.id)}>{shiftOptionLabel(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Tip: usá el rango de fechas arriba + el nombre del usuario para encontrar el turno sin escribir el ID.
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {notice && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>
            )}

            <div className="flex flex-wrap gap-2">
              {exportKind === 'PAYMENTS' && (
                <button
                  type="button"
                  onClick={exportPayments}
                  className={`rounded-xl bg-gray-900 px-3 py-2 text-sm text-white ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={exporting}
                >
                  {exporting ? 'Exportando…' : 'Exportar pagos'}
                </button>
              )}

              {exportKind === 'SHIFTS_SUMMARY' && (
                <button
                  type="button"
                  onClick={exportShiftsSummary}
                  className={`rounded-xl bg-gray-900 px-3 py-2 text-sm text-white ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={exporting}
                >
                  {exporting ? 'Exportando…' : 'Exportar turnos (resumen)'}
                </button>
              )}

              {exportKind === 'SHIFT_DETAIL' && (
                <button
                  type="button"
                  onClick={exportShiftDetail}
                  className={`rounded-xl bg-gray-900 px-3 py-2 text-sm text-white ${exporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  disabled={exporting}
                >
                  {exporting ? 'Exportando…' : 'Exportar turno (detalle)'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
