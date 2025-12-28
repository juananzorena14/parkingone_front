import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CheckInModal from '@/components/CheckInModal';
import { calcAmount } from '@/lib/price';
import { useData } from '@/stores/rateplans';
import CheckoutModal from '@/components/CheckoutModal';
import FixPaymentsModal from '@/components/FixPaymentsModal';
import { useAuth } from '@/stores/auth';
import CheckInReceiptModal from '@/components/CheckInReceiptModal';
import { notify } from '@/lib/toast';

export default function Tickets(){
  const [items, setItems] = useState([]);
  const [pending, setPending] = useState([]);
  const [q, setQ] = useState('');

  const [openIn, setOpenIn] = useState(false);
  const [openOut, setOpenOut] = useState(false);
  const [current, setCurrent] = useState(null);
  const [fixId, setFixId] = useState(null);
  const [openFix, setOpenFix] = useState(false);

  const user = useAuth(s => s.user);
  const { rateplans, fetchRateplans } = useData();
  const nowTick = useTicker(15000);
  const [receiptIn, setReceiptIn] = useState(null);
  const [openReceiptIn, setOpenReceiptIn] = useState(false);

  async function load() {
    const res = await api('/tickets?status=OPEN');
    setItems(res.data || res);
  }

  async function loadPending() {
    const res = await api('/tickets/shift?status=PAYMENT_PENDING');
    setPending(res.data || res);
  }

  useEffect(()=>{ load(); loadPending(); }, []);
  useEffect(() => { fetchRateplans(); }, []);

  function useTicker(ms = 15000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

  function beginCheckout(t){setCurrent(t); setOpenOut(true)};

  //para tarifas
  const rpById = useMemo(() => {
    const m = new Map();
    for (const r of rateplans) m.set(r.id, r);
    return m;
  }, [rateplans]);

  // Formateador ARS
  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  // ⬇️ Badge simple (Tailwind) para condición
  function Pill({ variant = 'outline', children }) {
    const base =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    const styles =
      variant === 'success' ? 'bg-green-100 text-green-800'
      : variant === 'warning' ? 'bg-amber-100 text-amber-800'
      : 'border border-gray-300 text-gray-700';
    return <span className={`${base} ${styles}`}>{children}</span>;
  }
  ;

  // Helpers
  function normPlate(p){
    return String(p || '').trim().toUpperCase().replace(/\s+/g,'');
  }

  function normQuery(v) {
    return String(v || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  function fmtDuration(minutes) {
    const m = Math.max(0, Math.floor(Number(minutes || 0)));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h <= 0) return `${mm}m`;
    if (mm <= 0) return `${h}h`;
    return `${h}h ${mm}m`;
  }

  function ageMinutes(dt) {
    if (!dt) return 0;
    const ms = Date.now() - new Date(dt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return 0;
    return Math.floor(ms / 60000);
  }

  //Columna precio en tiempo real
  function liveAmount(t) {
    if (t.isSubscription) return "—";
    const rp = rpById.get(t.ratePlanId) || rateplans.find(r => r.vehicleType === t.vehicleType);
    if (!rp) return '—';
    const checkIn = new Date(t.checkInAt);
    const minutes = Math.max(1, Math.ceil((Date.now() - checkIn.getTime()) / 60000));
    const amt = calcAmount(minutes, rp, nowTick);
    return amt == null ? '—' : fmt.format(amt);
  }

  const qNorm = useMemo(() => normQuery(q), [q]);

  function matchQuery(t, query) {
    if (!query) return true;
    const plate = normPlate(t?.plate);
    const entry = normQuery(t?.entryCode);
    const id = String(t?.id ?? '');
    return (
      plate.includes(query) ||
      entry.includes(query) ||
      id === query
    );
  }

  const filteredItems = useMemo(() => {
    if (!qNorm) return items;
    return items.filter(t => matchQuery(t, qNorm));
  }, [items, qNorm]);
  const filteredPending = useMemo(() => {
    if (!qNorm) return pending;
    return pending.filter(t => matchQuery(t, qNorm));
  }, [pending, qNorm]);

  async function handleSearchEnter() {
    const query = qNorm;
    if (!query) return;

    // 1) Match exact en memoria (ideal para scanner: pega el entryCode y manda Enter)
    const exactOpen = items.find((t) => normQuery(t?.entryCode) === query || String(t?.id ?? '') === query);
    if (exactOpen) {
      beginCheckout(exactOpen);
      setQ('');
      return;
    }

    // 2) Comportamiento anterior: si queda 1 match, acción directa
    if (filteredItems.length === 1) {
      beginCheckout(filteredItems[0]);
      setQ('');
      return;
    }
    if (filteredPending.length === 1) {
      setFixId(filteredPending[0].id);
      setOpenFix(true);
      setQ('');
      return;
    }

    // 3) Fallback: si parece entryCode, lo buscamos en el server (por si la lista no estaba actualizada)
    if (/^T[A-Z0-9_-]{4,}$/i.test(query)) {
      try {
        const res = await api(`/tickets/by-code/${encodeURIComponent(query)}`);
        const t = res?.ticket || res?.data?.ticket || res?.data || res;
        if (t?.id) {
          beginCheckout(t);
          setQ('');
          return;
        }
        notify.err('Código no encontrado');
      } catch (e) {
        notify.err(e?.message || 'Código no encontrado');
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Tickets</h1>

        <div className="flex items-center gap-2">
          <input
            className="px-3 py-2 rounded-lg shadow-md bg-white"
            placeholder="Buscar patente / código (QR)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              void handleSearchEnter();
            }}
          />
          {q && (
            <button className="px-3 py-2 rounded-lg border bg-white" onClick={() => setQ('')}>
              Limpiar
            </button>
          )}
          <button onClick={()=>setOpenIn(true)} className="px-3 py-2 rounded-lg shadow-md bg-white">
            Nuevo ingreso
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Tickets abiertos</h2>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filteredItems.map((t) => {
            const mins = ageMinutes(t.checkInAt);
            const isOld = mins >= 240;
            const vehicleLabel = ({ CAR: 'Auto', MOTO: 'Moto', PICKUP: 'Camioneta' }[t.vehicleType] || t.vehicleType);

            return (
              <div key={t.id} className={`rounded-2xl bg-white shadow-md border p-3 ${isOld ? 'border-amber-200 bg-amber-50/50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{t.plate}</div>
                    <div className="text-xs text-gray-500">Ticket #{t.id} · {vehicleLabel}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg ${mins >= 240 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                    {fmtDuration(mins)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Ingreso</div>
                    <div className="font-medium">{new Date(t.checkInAt).toLocaleTimeString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Precio</div>
                    <div className="font-semibold">{liveAmount(t)}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    {t.isSubscription ? (
                      t.subscriptionWarning === 'PAST_DUE'
                        ? <Pill variant="warning">Vencido</Pill>
                        : <Pill variant="success">Abonado</Pill>
                    ) : (
                      <Pill variant="outline">Hora</Pill>
                    )}
                  </div>
                  <button onClick={() => beginCheckout(t)} className="px-3 py-2 rounded-xl border bg-gray-900 text-white">
                    Cobrar
                  </button>
                </div>
              </div>
            );
          })}

          {!filteredItems.length && (
            <div className="rounded-xl bg-white border p-4 text-gray-500">Sin tickets abiertos</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl shadow-md bg-white">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-white">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Patente</th>
                <th className="p-2 text-left">Vehículo</th>
                <th className="p-2 text-left">Ingreso</th>
                <th className="p-2 text-left">Hace</th>
                <th className="p-2 text-left">Precio</th>
                <th className="p-2 text-left">Condición</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(t => {
                const mins = ageMinutes(t.checkInAt);
                const isOld = mins >= 240; // 4h+
                return (
                <tr key={t.id} className={`border-t ${isOld ? 'bg-amber-50' : ''}`}>
                  <td className="p-2">{t.id}</td>
                  <td className="p-2">{t.plate}</td>
                  <td className="p-2">
                    {{
                      CAR: 'Auto',
                      MOTO: 'Moto',
                      PICKUP: 'Camioneta',
                    }[t.vehicleType] || t.vehicleType}
                  </td>

                  <td className="p-2">{new Date(t.checkInAt).toLocaleString()}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded-lg ${mins >= 240 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                      {fmtDuration(mins)}
                    </span>
                  </td>
                  <td className="p-2">{liveAmount(t)}</td>
                  <td className="p-2">
                    {t.isSubscription ? (
                      t.subscriptionWarning === 'PAST_DUE'
                        ? <Pill variant="warning">Vencido</Pill>
                        : <Pill variant="success">Abonado</Pill>
                    ) : (
                      <Pill variant="outline">Hora</Pill>
                    )}
                  </td>
                  
                  <td className="p-2 text-right">
                    <button onClick={()=>beginCheckout(t)} className="px-3 py-1 rounded-lg border">Cobrar</button>
                  </td>
                </tr>
                );
              })}
              {!filteredItems.length && (
                <tr><td className="p-4" colSpan="8">Sin tickets abiertos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Pendientes de cobro</h2>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filteredPending.map((t) => {
            const mins = ageMinutes(t.checkOutAt);
            const isOld = mins >= 30;

            return (
              <div key={t.id} className={`rounded-2xl bg-white shadow-md border p-3 ${isOld ? 'border-amber-200 bg-amber-50/50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{t.plate}</div>
                    <div className="text-xs text-gray-500">Ticket #{t.id}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-lg ${mins >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                    {t.checkOutAt ? fmtDuration(mins) : '—'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Salida</div>
                    <div className="font-medium">{t.checkOutAt ? new Date(t.checkOutAt).toLocaleTimeString() : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Saldo</div>
                    <div className="font-semibold text-amber-800">{fmt.format(t.balance || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-medium">{fmt.format(t.ticketTotal || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Pagado</div>
                    <div className="font-medium">{fmt.format(t.totalPaid || 0)}</div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="px-3 py-2 rounded-xl border bg-gray-900 text-white"
                    onClick={() => { setFixId(t.id); setOpenFix(true); }}
                  >
                    Completar
                  </button>
                </div>
              </div>
            );
          })}

          {!filteredPending.length && (
            <div className="rounded-xl bg-white border p-4 text-gray-500">Sin pendientes</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl shadow-md bg-white">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-white">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Patente</th>
                <th className="p-2 text-left">Salida</th>
                <th className="p-2 text-left">Hace</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Pagado</th>
                <th className="p-2 text-right">Saldo</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPending.map(t => {
                const mins = ageMinutes(t.checkOutAt);
                const isOld = mins >= 30; // 30m+ pendiente
                return (
                <tr key={t.id} className={`border-t ${isOld ? 'bg-amber-50' : ''}`}>
                  <td className="p-2">{t.id}</td>
                  <td className="p-2">{t.plate}</td>
                  <td className="p-2">{t.checkOutAt ? new Date(t.checkOutAt).toLocaleString() : '-'}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded-lg ${mins >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
                      {t.checkOutAt ? fmtDuration(mins) : '—'}
                    </span>
                  </td>
                  <td className="p-2 text-right">{fmt.format(t.ticketTotal || 0)}</td>
                  <td className="p-2 text-right">{fmt.format(t.totalPaid || 0)}</td>
                  <td className="p-2 text-right">{fmt.format(t.balance || 0)}</td>
                  <td className="p-2 text-right">
                    <button
                      className="px-3 py-1 rounded-lg border"
                      onClick={() => { setFixId(t.id); setOpenFix(true); }}
                    >
                      Completar
                    </button>
                  </td>
                </tr>
                );
              })}
              {!filteredPending.length && (
                <tr><td className="p-4" colSpan="8">Sin pendientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CheckInModal
        open={openIn}
        onClose={()=>setOpenIn(false)}
        onDone={(ticket)=>{load(); setReceiptIn(ticket); setOpenReceiptIn(true)}}
      />
      <CheckInReceiptModal
        open={openReceiptIn}
        onClose={()=>setOpenReceiptIn(false)}
        data={receiptIn}
      />
      <CheckoutModal
        open={openOut}
        ticket={current}
        onClose={() => {
          setOpenOut(false);
          setCurrent(null);
        }}
        onDone={(ticketId) => {
          setOpenOut(false);
          setCurrent(null);
          setItems((prev) => prev.filter((t) => Number(t.id) !== Number(ticketId)));
          setTimeout(() => { load(); loadPending(); }, 200);
        }}
      />

      <FixPaymentsModal
        open={openFix}
        ticketId={fixId}
        onClose={() => { setOpenFix(false); setFixId(null); }}
        onDone={() => loadPending()}
      />
    </div>
  );
}
