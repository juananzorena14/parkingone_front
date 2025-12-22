import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';

const METHODS = [
  { value: 'CASH',     label: 'Efectivo' },
  { value: 'DEBIT',    label: 'Débito' },
  { value: 'CREDIT',   label: 'Crédito' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

export default function ChargeSubscriptionModal({ open, data, onClose, onDone }) {
  // data: fila del abonado { id, fullName, plate, priceMonthly, nextDueDate }
  const [months, setMonths]   = useState(1);
  const [method, setMethod]   = useState('CASH'); // por ahora no se usa en backend (endpoint simple)
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );
  const amount = useMemo(() => {
    const p = Number(data?.priceMonthly || 0);
    return p * months;
  }, [data, months]);

  useEffect(() => {
    if (open) {
      setMonths(1);
      setMethod('CASH');
      setBusy(false);
      setErr('');
    }
  }, [open]);

  if (!open || !data) return null;

  async function submit() {
    try {
      setBusy(true);
      setErr('');

      await api(`/subscribers/${data.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months, method }),
      });

      notify.ok('Pago registrado');
      onDone?.();
      onClose?.();
    } catch (e) {
      notify.err(e.message || e);
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-4 shadow">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Generar pago de suscripción</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="text-sm text-gray-600 mb-3 space-y-1">
          <div><b>Abonado:</b> {data.fullName || '—'} ({data.plate})</div>
          <div><b>Plan:</b> {data.planName || 'Mensual'}</div>
          <div><b>Precio mensual:</b> {fmt.format(Number(data.priceMonthly || 0))}</div>
          <div><b>Próximo vencimiento actual:</b> {data.nextDueDate ? new Date(data.nextDueDate).toLocaleDateString() : '—'}</div>
        </div>

        {err && <div className="text-sm text-red-600 mb-3">{err}</div>}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-sm text-gray-700">Meses a acreditar</span>
            <select
              className="mt-1 w-full rounded-lg border p-2 bg-white"
              value={months}
              onChange={e=>setMonths(Number(e.target.value))}
            >
              {[1,3,6,12].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-sm text-gray-700">Método</span>
            <select
              className="mt-1 w-full rounded-lg border p-2 bg-white"
              value={method}
              onChange={e=>setMethod(e.target.value)}
            >
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-lg bg-gray-50 border p-3 text-sm mb-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total a cobrar</span>
            <span className="font-semibold">{fmt.format(amount)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Se registra un movimiento en "Movimientos" y se actualiza el próximo vencimiento.
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border bg-white" disabled={busy}>
            Cancelar
          </button>
          <button
            onClick={submit}
            className="px-3 py-2 rounded-lg border bg-gray-900 text-white disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Procesando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
