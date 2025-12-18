import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { api } from '@/lib/api';
import { useData } from '@/stores/rateplans';
import { calcAmount } from '@/lib/price'; // si no lo tenés, te dejo fallback abajo
import { notify } from '@/lib/toast';

const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'MP', label: 'Mercado Pago' },
];

export default function CheckoutModal({ open, ticket, onClose, onDone, userId }) {
  const { rateplans, fetchRateplans } = useData();
  const [loading, setLoading] = useState(false);
  const [amountDue, setAmount] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [method, setMethod] = useState('CASH');
  const [received, setReceived] = useState('');
  const [error, setError] = useState('');

  // formateador $ARS
  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  // carga tarifas (por si no están) y estima total al abrir
  useEffect(() => {
    if (!open || !ticket) return;
    setError(''); setMethod('CASH'); setReceived(''); setMinutes(0); setAmount(0);
    fetchRateplans(); // no re-fetch si ya están
    (async () => {
      setLoading(true);
      try {
        // 1) intento server-side (si implementaste /estimate)
        const est = await api(`/tickets/${ticket.id}/estimate`).catch(() => null);
        if (est?.amount != null) {
          setAmount(est.amount);
          setMinutes(est.minutes);
          return;
        }
        // 2) fallback: cálculo local con rateplans
        const rp = rateplans.find(r => r.id === ticket.ratePlanId) ||
                   rateplans.find(r => r.vehicleType === ticket.vehicleType);
        if (!rp) throw new Error('No se encontró la tarifa del ticket.');
        const checkIn = new Date(ticket.checkInAt);
        const mins = Math.max(1, Math.ceil((Date.now() - checkIn.getTime()) / 60000));
        setMinutes(mins);
        setAmount(calcAmount(mins, rp, new Date()));
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticket]);

  const change = useMemo(() => {
    const r = Number(received || 0);
    const due = Number(amountDue || 0);
    return Math.max(0, r - due);
  }, [received, amountDue]);

  const canConfirm = useMemo(() => {
    if (loading || !ticket) return false;
    if (!Number.isFinite(Number(amountDue))) return false;
    if (method === 'CASH') return Number(received) >= Number(amountDue);
    return true; // tarjetas/MP no requieren "recibido"
  }, [loading, ticket, amountDue, method, received]);

  async function confirm() {
    try {
      setLoading(true); setError('');
      const body = { method, ...(method === 'CASH' ? { amountGiven: Number(received) } : {}) };
      const res = await api(`/tickets/${ticket.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      notify.ok(`Cobrado correctamente`);
      const closedId = res?.ticketId ?? ticket?.id ?? res?.id;
      onDone?.(closedId, res);
      onClose?.();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose?.()}
      title={`Cobrar ticket #${ticket?.id ?? ''}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="px-3 py-2 rounded-lg border bg-white" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className={`px-3 py-2 rounded-lg border bg-gray-900 text-white ${!canConfirm ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            Confirmar y cobrar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">Patente</div>
            <div className="font-medium">{ticket?.plate}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Tiempo</div>
            <div className="font-medium">{minutes} min</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-2xl font-semibold">{fmt.format(Number(amountDue || 0))}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Método</div>
            <select
              className="w-full rounded-lg border p-2 bg-white"
              value={method}
              onChange={e => setMethod(e.target.value)}
              disabled={loading}
            >
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {method === 'CASH' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Recibido</div>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-lg border p-2"
                value={received}
                onChange={e => setReceived(e.target.value)}
                disabled={loading}
                placeholder="0"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Vuelto</div>
              <div className="font-medium">{fmt.format(change)}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* --- Fallback si no tenés src/lib/price.js ---
const toNum = v => (v == null || v === '') ? null : Number(v);
function isNight(now, start, end) {
  if (start == null || end == null) return false;
  const h = new Date(now).getHours();
  return start <= end ? (h >= start && h < end) : (h >= start || h < end);
}
export function calcAmount(minutes, rp, now = new Date()) {
  if (!rp) return null;
  const tol  = toNum(rp.toleranceMin) || 0;
  if (tol && minutes <= tol) return 0;
  const flat = toNum(rp.nightFlat);
  const ns   = toNum(rp.nightStartsAt);
  const ne   = toNum(rp.nightEndsAt);
  if (flat && isNight(now, ns, ne)) return flat;
  const base = toNum(rp.base) || 0;
  const ph   = toNum(rp.perHour);
  const p15  = toNum(rp.per15min);
  let total = base;
  if (ph) total += Math.ceil(minutes / 60) * ph;
  else if (p15) total += Math.ceil(minutes / 15) * p15;
  return total;
}
*/
