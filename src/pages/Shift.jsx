import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { onShiftChanged } from '@/lib/shiftEvents';
import ShiftMovementModal from '@/components/ShiftMovementModal';
import Modal from '@/components/Modal';
import { notify } from '@/lib/toast';

function fmtDuration(minutes) {
  const m = Math.max(0, Math.floor(Number(minutes || 0)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h <= 0) return `${mm}m`;
  if (mm <= 0) return `${h}h`;
  return `${h}h ${mm}m`;
}

function BoxPill({ box }) {
  const b = String(box || '').toUpperCase();
  const cls = b === 'CASH' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800';
  const label = b === 'CASH' ? 'Efectivo' : 'Transferencia';
  return <span className={`text-xs px-2 py-1 rounded-lg ${cls}`}>{label}</span>;
}

function PaymentMethodPill({ method }) {
  const m = String(method || '').toUpperCase();
  const cls =
    m === 'CASH' ? 'bg-indigo-100 text-indigo-800' :
    m === 'DEBIT' ? 'bg-amber-100 text-amber-800' :
    m === 'CREDIT' ? 'bg-fuchsia-100 text-fuchsia-800' :
    m === 'TRANSFER' ? 'bg-gray-100 text-gray-700' :
    'bg-gray-100 text-gray-700';
  const label =
    m === 'CASH' ? 'Efectivo' :
    m === 'DEBIT' ? 'Débito' :
    m === 'CREDIT' ? 'Crédito' :
    m === 'TRANSFER' ? 'Transferencia' :
    'Otro';
  return <span className={`text-xs px-2 py-1 rounded-lg ${cls}`}>{label}</span>;
}

function PaymentRefKindPill({ refKind }) {
  const k = String(refKind || '').toUpperCase();
  const cls =
    k === 'SUBSCRIPTION' ? 'bg-amber-100 text-amber-800' :
    k === 'TICKET' ? 'bg-sky-100 text-sky-800' :
    'bg-gray-100 text-gray-700';
  const label =
    k === 'SUBSCRIPTION' ? 'Abonado' :
    k === 'TICKET' ? 'Ticket' :
    'Otro';
  return <span className={`text-xs px-2 py-1 rounded-lg ${cls}`}>{label}</span>;
}

function DirectionPill({ direction }) {
  const d = String(direction || '').toUpperCase();
  const cls = d === 'OUT' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800';
  const label = d === 'OUT' ? 'Egreso' : 'Ingreso';
  return <span className={`text-xs px-2 py-1 rounded-lg ${cls}`}>{label}</span>;
}

export default function Shift() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [shift, setShift] = useState(null);
  const [boxes, setBoxes] = useState(null);
  const [movements, setMovements] = useState([]);

  const [filterDir, setFilterDir] = useState('ALL');
  const [filterBox, setFilterBox] = useState('ALL');
  const [filterKind, setFilterKind] = useState('ALL');

  const [openAdd, setOpenAdd] = useState(false);

  const [openReverse, setOpenReverse] = useState(false);
  const [reverseTarget, setReverseTarget] = useState(null); // { id, amount, method, ref }
  const [reverseReason, setReverseReason] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const res = await api('/api/cash-shifts/current/ledger');
      setShift(res.shift || null);
      setBoxes(res.boxes || null);
      setMovements(res.movements || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function openReverseFor(m) {
    setReverseTarget({ id: m.id, amount: m.amount, method: m.method, ref: m.ref });
    setReverseReason('');
    setOpenReverse(true);
  }

  async function confirmReverse() {
    if (!reverseTarget?.id) return;
    const reason = String(reverseReason || '').trim();
    if (!reason) {
      notify.err('Ingresá un motivo');
      return;
    }

    try {
      await api(`/payments/${reverseTarget.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      notify.ok('Pago reversado');
      setOpenReverse(false);
      setReverseTarget(null);
      await load();
    } catch (e) {
      notify.err(e?.message || 'No se pudo reversar');
    }
  }

  useEffect(() => {
    load();

    const off = onShiftChanged(() => load());
    const id = setInterval(() => load(), 15000);

    return () => {
      off();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openedAt = shift?.openedAt ? dayjs(shift.openedAt) : null;
  const durationMin = openedAt ? dayjs().diff(openedAt, 'minute') : 0;

  const expectedTotal = useMemo(() => {
    const c = Number(boxes?.CASH?.expectedNow || 0);
    const t = Number(boxes?.TRANSFER?.expectedNow || 0);
    return c + t;
  }, [boxes]);

  const filteredMovements = useMemo(() => {
    return (movements || []).filter((m) => {
      const dir = String(m.direction || '').toUpperCase();
      const box = String(m.box || m.method || '').toUpperCase();
      const kind = String(m.kind || '').toUpperCase();

      if (filterDir !== 'ALL' && dir !== filterDir) return false;
      if (filterBox !== 'ALL' && box !== filterBox) return false;
      if (filterKind !== 'ALL' && kind !== filterKind) return false;
      return true;
    });
  }, [movements, filterDir, filterBox, filterKind]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Mi turno</h1>
          {openedAt && <div className="text-sm text-gray-600">Abierto: {openedAt.format('DD/MM HH:mm')} · Duración: {fmtDuration(durationMin)}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-lg border bg-white flex items-center gap-2" onClick={() => load()} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={() => setOpenAdd(true)}>
            Nuevo movimiento
          </button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {loading && <div className="text-sm text-gray-500">Cargando…</div>}

      {boxes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">Total esperado ahora</div>
              <Wallet className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-3xl font-semibold">{fmt.format(expectedTotal)}</div>
            <div className="text-xs text-gray-500 mt-1">Efectivo + Transferencia</div>
          </div>

          {(['CASH', 'TRANSFER']).map((k) => {
            const b = boxes[k];
            const title = k === 'CASH' ? 'Efectivo' : 'Transferencia';
            return (
              <div key={k} className="rounded-2xl bg-white p-4 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{title}</div>
                  <BoxPill box={k} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Apertura</div>
                    <div className="font-medium">{fmt.format(b.opening || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Esperado ahora</div>
                    <div className="font-semibold">{fmt.format(b.expectedNow || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Ingresos (pagos)</div>
                    <div className="font-medium">{fmt.format(b.inPayments || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Manuales (neto)</div>
                    <div className="font-medium">{fmt.format((b.inManual || 0) - (b.outManual || 0))}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-md space-y-3">
        <div className="flex items-end justify-between gap-2 flex-wrap">
          <div className="font-semibold">Movimientos del turno</div>
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-xs text-gray-500">Tipo</label>
              <select className="block rounded-lg border p-2 bg-white" value={filterDir} onChange={(e) => setFilterDir(e.target.value)}>
                <option value="ALL">Todos</option>
                <option value="IN">Ingresos</option>
                <option value="OUT">Egresos</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Caja</label>
              <select className="block rounded-lg border p-2 bg-white" value={filterBox} onChange={(e) => setFilterBox(e.target.value)}>
                <option value="ALL">Todas</option>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Origen</label>
              <select className="block rounded-lg border p-2 bg-white" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
                <option value="ALL">Todos</option>
                <option value="PAYMENT">Pagos</option>
                <option value="MANUAL">Manuales</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {filteredMovements.map((m) => {
            const isOut = String(m.direction).toUpperCase() === 'OUT';
            const amtCls = isOut ? 'text-amber-700' : 'text-green-700';
            const icon = isOut ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />;

            const detail = m.kind === 'PAYMENT'
              ? (m.ref || '-')
              : `${m.category || 'MOV'}${m.note ? ` · ${m.note}` : ''}`;

            return (
              <div key={`${m.kind}-${m.id}`} className="rounded-2xl border bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className={amtCls}>{icon}</span>
                    <DirectionPill direction={m.direction} />

                    {/* En mobile, evitamos pills redundantes que rompen el ancho */}
                    {m.kind === 'PAYMENT' ? (
                      <>
                        <PaymentRefKindPill refKind={m.refKind} />
                        <PaymentMethodPill method={m.method} />
                      </>
                    ) : (
                      <BoxPill box={m.box || m.method} />
                    )}
                  </div>
                  <div className={`font-semibold ${amtCls} shrink-0`}>{fmt.format(m.amount || 0)}</div>
                </div>

                <div className="mt-2 text-sm">
                  <div className="text-xs text-gray-500">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</div>
                  <div className="mt-1">{detail}</div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                  <div>{m.kind === 'PAYMENT' ? 'Pago' : 'Manual'}</div>
                  {m.kind === 'PAYMENT' && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded-lg border bg-white text-gray-700"
                      onClick={() => openReverseFor(m)}
                    >
                      Reversar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {!filteredMovements.length && !loading && (
            <div className="rounded-xl bg-white border p-4 text-gray-500">Sin movimientos.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Tipo</th>
                <th className="p-2 text-left">Caja / método</th>
                <th className="p-2 text-right">Monto</th>
                <th className="p-2 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((m) => {
                const isOut = String(m.direction).toUpperCase() === 'OUT';
                const amtCls = isOut ? 'text-amber-700' : 'text-green-700';
                const icon = isOut ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />;

                const detail = m.kind === 'PAYMENT'
                  ? (m.ref || '-')
                  : `${m.category || 'MOV'}${m.note ? ` · ${m.note}` : ''}`;

                return (
                  <tr key={`${m.kind}-${m.id}`} className="border-t">
                    <td className="p-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : '-'}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className={amtCls}>{icon}</span>
                        <DirectionPill direction={m.direction} />
                        <span className="text-xs text-gray-500">{m.kind === 'PAYMENT' ? 'Pago' : 'Manual'}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BoxPill box={m.box || m.method} />
                        {m.kind === 'PAYMENT' && <PaymentRefKindPill refKind={m.refKind} />}
                        {m.kind === 'PAYMENT' && <PaymentMethodPill method={m.method} />}
                      </div>
                    </td>
                    <td className={`p-2 text-right font-medium ${amtCls}`}>{fmt.format(m.amount || 0)}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">{detail}</div>
                        {m.kind === 'PAYMENT' && (
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg border bg-white text-xs"
                            onClick={() => openReverseFor(m)}
                          >
                            Reversar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredMovements.length && !loading && (
                <tr><td className="p-3 text-gray-500" colSpan={5}>Sin movimientos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShiftMovementModal open={openAdd} onClose={() => setOpenAdd(false)} onDone={() => load()} />

      <Modal
        open={openReverse}
        onClose={() => setOpenReverse(false)}
        title={reverseTarget ? `Reversar pago #${reverseTarget.id}` : 'Reversar pago'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-lg border bg-white" onClick={() => setOpenReverse(false)}>
              Cancelar
            </button>
            <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={confirmReverse}>
              Confirmar reverso
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {reverseTarget && (
            <div className="text-sm text-gray-600">
              <div><b>Ref:</b> {reverseTarget.ref || '-'}</div>
              <div><b>Método:</b> {reverseTarget.method || '-'}</div>
              <div><b>Monto:</b> {fmt.format(reverseTarget.amount || 0)}</div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500">Motivo</label>
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Ej: error de método / monto"
            />
            <div className="mt-1 text-xs text-gray-500">
              Solo se permite reversar pagos recién hechos del turno actual.
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
