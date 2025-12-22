import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';

const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

export default function FixPaymentsModal({ open, ticketId, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [ticket, setTicket] = useState(null);
  const [payments, setPayments] = useState([]);

  // add payment form
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [amountGiven, setAmountGiven] = useState('');
  const [note, setNote] = useState('');

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  async function load() {
    if (!ticketId) return;
    setErr('');
    setLoading(true);
    try {
      const res = await api(`/tickets/shift/${ticketId}`);
      setTicket(res.ticket);
      setPayments(res.payments || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setMethod('CASH');
    setAmount('');
    setAmountGiven('');
    setNote('');
    setEditingId(null);
    setEditDraft(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

  const totals = useMemo(() => {
    const due = Number(ticket?.ticketTotal ?? ticket?.amount ?? 0);
    const paid = Number(ticket?.totalPaid ?? 0);
    const bal = Number(ticket?.balance ?? (due - paid));
    return { due, paid, bal };
  }, [ticket]);

  async function addPayment() {
    try {
      setLoading(true);
      setErr('');

      const payload = {
        method,
        amount: Number(amount || 0),
        note: note ? String(note) : null,
        ...(String(method).toUpperCase() === 'CASH' && amountGiven !== '' ? { amountGiven: Number(amountGiven) } : {}),
      };

      await api(`/tickets/${ticketId}/payments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      notify.ok('Pago agregado');
      setAmount('');
      setAmountGiven('');
      setNote('');
      await load();

      // auto-close if fully paid
      const latest = await api(`/tickets/shift/${ticketId}`);
      if (String(latest?.ticket?.status) === 'CLOSED' || Number(latest?.ticket?.balance ?? 0) <= 0) {
        notify.ok('Ticket cerrado');
        onDone?.();
        onClose?.();
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditDraft({
      method: p.method,
      amount: String(p.amount ?? ''),
      amountGiven: p.amountGiven == null ? '' : String(p.amountGiven),
      note: p.note == null ? '' : String(p.note),
    });
  }

  async function saveEdit(id) {
    try {
      setLoading(true);
      setErr('');

      const payload = {
        method: String(editDraft?.method || '').toUpperCase(),
        amount: Number(editDraft?.amount || 0),
        note: editDraft?.note === '' ? null : (editDraft?.note ?? null),
      };
      if (payload.method === 'CASH' && editDraft?.amountGiven !== '') {
        payload.amountGiven = Number(editDraft.amountGiven);
      }

      await api(`/payments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      notify.ok('Pago actualizado');
      setEditingId(null);
      setEditDraft(null);
      await load();

      const latest = await api(`/tickets/shift/${ticketId}`);
      if (String(latest?.ticket?.status) === 'CLOSED' || Number(latest?.ticket?.balance ?? 0) <= 0) {
        notify.ok('Ticket cerrado');
        onDone?.();
        onClose?.();
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function delPayment(id) {
    if (!confirm('¿Eliminar este pago?')) return;
    try {
      setLoading(true);
      setErr('');
      await api(`/payments/${id}`, { method: 'DELETE' });
      notify.ok('Pago eliminado');
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose?.()}
      title={ticket ? `Pagos ticket #${ticket.id}` : 'Pagos'}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border bg-white" onClick={onClose} disabled={loading}>
            Cerrar
          </button>
        </div>
      }
    >
      {err && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2 mb-3">{err}</div>}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <div className="text-xs text-gray-500">Total</div>
          <div className="font-semibold">{fmt.format(totals.due || 0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Pagado</div>
          <div className="font-semibold">{fmt.format(totals.paid || 0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Saldo</div>
          <div className={`font-semibold ${totals.bal > 0 ? 'text-amber-700' : 'text-green-700'}`}>{fmt.format(totals.bal || 0)}</div>
        </div>
      </div>

      <div className="rounded-xl border p-3 space-y-2 mb-4">
        <div className="text-sm font-medium">Agregar pago</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500 mb-1">Método</div>
            <select className="w-full rounded-lg border p-2 bg-white" value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Importe</div>
            <input className="w-full rounded-lg border p-2" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        {String(method).toUpperCase() === 'CASH' && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Recibido (opcional)</div>
            <input className="w-full rounded-lg border p-2" type="number" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} />
          </div>
        )}

        <div>
          <div className="text-xs text-gray-500 mb-1">Nota (opcional)</div>
          <input
            className="w-full rounded-lg border p-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: pagó mitad en efectivo"
          />
        </div>

        <button
          className="px-3 py-2 rounded-lg border bg-gray-900 text-white w-full disabled:opacity-70"
          onClick={addPayment}
          disabled={loading}
        >
          Agregar
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Pagos registrados</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left">Fecha</th>
                <th className="p-2 text-left">Método</th>
                <th className="p-2 text-right">Monto</th>
                <th className="p-2 text-left">Usuario</th>
                <th className="p-2 text-left">Nota</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const isEditing = editingId === p.id;
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <select
                          className="rounded-lg border p-1 bg-white"
                          value={editDraft?.method || p.method}
                          onChange={(e) => setEditDraft((d) => ({ ...d, method: e.target.value }))}
                        >
                          {METHODS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.method
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {isEditing ? (
                        <input
                          className="w-24 rounded-lg border p-1 text-right"
                          type="number"
                          value={editDraft?.amount ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, amount: e.target.value }))}
                        />
                      ) : (
                        fmt.format(p.amount || 0)
                      )}
                    </td>
                    <td className="p-2">{p.userName || p.createdBy || '-'}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <input
                          className="w-full rounded-lg border p-1"
                          value={editDraft?.note ?? ''}
                          onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
                          placeholder="Nota"
                        />
                      ) : (
                        p.note || '-'
                      )}
                    </td>
                    <td className="p-2 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-2">
                          <button className="px-2 py-1 rounded-lg border bg-white" onClick={() => { setEditingId(null); setEditDraft(null); }}>
                            Cancelar
                          </button>
                          <button className="px-2 py-1 rounded-lg border bg-gray-900 text-white" onClick={() => saveEdit(p.id)}>
                            Guardar
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2">
                          <button className="px-2 py-1 rounded-lg border bg-white" onClick={() => startEdit(p)}>
                            Editar
                          </button>
                          <button className="px-2 py-1 rounded-lg border bg-white" onClick={() => delPayment(p.id)}>
                            Borrar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!payments.length && <tr><td className="p-3 text-gray-500" colSpan={6}>Sin pagos.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
