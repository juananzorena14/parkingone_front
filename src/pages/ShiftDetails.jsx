import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

function paymentKind(p) {
  if (p.ticketId) return 'TICKET';
  if (p.subscriberId) return 'SUBSCRIPTION';
  return 'OTHER';
}

function paymentRef(p) {
  if (p.ticketId) return `#${p.ticketId} ${p.ticketPlate || ''}`.trim();
  if (p.subscriberId) return `${p.subscriberName || ''} (${p.subscriberPlate || ''})`.trim();
  return p.note || '-';
}

function fmtDuration(minutes) {
  const m = Math.max(0, Math.floor(Number(minutes || 0)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm <= 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

export default function ShiftDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shift, setShift] = useState(null);
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr('');
      setLoading(true);
      try {
        const res = await api(`/api/cash-shifts/${id}/details`);
        if (cancelled) return;
        setShift(res.shift);
        setPayments(res.payments || []);
        setTotals(res.totals || null);
      } catch (e) {
        if (!cancelled) setErr(String(e.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const openedAt = shift?.openedAt ? dayjs(shift.openedAt) : null;
  const closedAt = shift?.closedAt ? dayjs(shift.closedAt) : null;
  const durationMin = openedAt ? (closedAt || dayjs()).diff(openedAt, 'minute') : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg border bg-white"
            onClick={() => navigate(-1)}
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xl font-semibold">Detalle de turno</div>
            {shift && (
              <div className="text-sm text-gray-600">
                {shift.userName || `#${shift.userId}`} · {shift.userRole || '-'}
              </div>
            )}
          </div>
        </div>

        {shift && (
          <div>
            {shift.closedAt ? (
              <span className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700">CERRADO</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800">ABIERTO</span>
            )}
          </div>
        )}
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {loading && <div className="text-sm text-gray-500">Cargando…</div>}

      {shift && (
        <div className="rounded-2xl bg-white p-4 shadow-md space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-500">Horario</div>
              <div className="text-sm">
                {shift.openedAt ? new Date(shift.openedAt).toLocaleString() : '-'}
                {'  —  '}
                {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'Ahora'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Duración</div>
              <div className="text-sm font-medium">{fmtDuration(durationMin)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ID turno</div>
              <div className="text-sm font-medium">#{shift.id}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Entrada</div>
              <div className="font-semibold">{fmt.format(shift.openingCash || 0)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Efectivo neto</div>
              <div className="font-semibold">{fmt.format(totals?.cashNet || 0)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Esperado</div>
              <div className="font-semibold">{fmt.format(shift.expectedAtClose || 0)}</div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="text-xs text-gray-500">Diferencia</div>
              <div className="font-semibold">{shift.diff == null ? '-' : fmt.format(shift.diff)}</div>
            </div>
          </div>

          {totals?.byMethod && (
            <div className="pt-1">
              <div className="text-sm font-semibold mb-2">Totales por método</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(totals.byMethod).map(([method, amount]) => (
                  <div key={method} className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
                    {method}: <span className="font-semibold">{fmt.format(amount || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-md space-y-3">
        <div className="font-semibold">Movimientos del turno</div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Referencia</th>
                <th className="p-2 text-left">Método</th>
                <th className="p-2 text-right">Monto</th>
                <th className="p-2 text-left">Nota</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const kind = paymentKind(p);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs ${
                          kind === 'SUBSCRIPTION'
                            ? 'bg-amber-100 text-amber-800'
                            : kind === 'TICKET'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {kind === 'SUBSCRIPTION' ? 'Suscripción' : kind === 'TICKET' ? 'Ticket' : 'Otro'}
                      </span>
                    </td>
                    <td className="p-2">{paymentRef(p)}</td>
                    <td className="p-2">{p.method || '-'}</td>
                    <td className="p-2 text-right">{fmt.format(p.amount || 0)}</td>
                    <td className="p-2">{p.note || '-'}</td>
                  </tr>
                );
              })}

              {!payments.length && !loading && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={6}>
                    Sin movimientos para este turno.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
