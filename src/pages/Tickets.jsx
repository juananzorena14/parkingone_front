import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import CheckInModal from '@/components/CheckInModal';
import { calcAmount } from '@/lib/price';
import { useData } from '@/stores/rateplans';
import CheckoutModal from '@/components/CheckoutModal';
import { useAuth } from '@/stores/auth';
import CheckInReceiptModal from '@/components/CheckInReceiptModal';


export default function Tickets(){
  const [items, setItems] = useState([]);
  const [openIn, setOpenIn] = useState(false);
  const [openOut, setOpenOut] = useState(false);
  const [current, setCurrent] = useState(null);
  const user = useAuth(s => s.user);
  const { rateplans, fetchRateplans } = useData();
  const nowTick = useTicker(15000);
  const [receiptIn, setReceiptIn] = useState(null);
  const [openReceiptIn, setOpenReceiptIn] = useState(false);

  async function load() {
    const res = await api('/tickets?status=OPEN');
    setItems(res.data || res);
  }

  useEffect(()=>{ load() }, []);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets abiertos</h1>
        <button onClick={()=>setOpenIn(true)} className="px-3 py-2 rounded-lg shadow-md bg-white">
          Nuevo ingreso
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-md bg-white">
        <table className="min-w-full text-sm table-auto">
          <thead className="bg-white">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Patente</th>
              <th className="p-2 text-left">Vehículo</th>
              <th className="p-2 text-left">Ingreso</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Condición</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id} className="border-t">
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
            ))}
            {!items.length && (
              <tr><td className="p-4" colSpan="7">Sin tickets abiertos</td></tr>
            )}
          </tbody>
        </table>
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
        onClose={() => {setOpenOut(false); setCurrent(null)}}
        onDone={(ticketId) => {
          setOpenOut(false);
          setCurrent(null);
          // Optimistic update: sacarlo de la lista YA
          setItems(prev => prev.filter(t => Number(t.id) !== Number(ticketId)));
          // (opcional) revalidar contra el backend
          setTimeout(() => load(), 200);
        }}
        userId={user?.id}
      />
    </div>
  );
}
