import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';
import { emitShiftChanged } from '@/lib/shiftEvents';

const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

const DIRECTIONS = [
  { value: 'OUT', label: 'Egreso' },
  { value: 'IN', label: 'Ingreso' },
];

export default function ShiftMovementModal({ open, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('OUT');
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('GASTO');
  const [note, setNote] = useState('');

  const canSave = useMemo(() => {
    const amt = Number(amount);
    return !loading && ['IN', 'OUT'].includes(direction) && ['CASH', 'TRANSFER'].includes(method) && Number.isFinite(amt) && amt > 0;
  }, [loading, direction, method, amount]);

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setDirection('OUT');
    setMethod('CASH');
    setAmount('');
    setCategory('GASTO');
    setNote('');
  }, [open]);

  async function save() {
    if (!canSave) return;

    try {
      setLoading(true);
      await notify.promise(
        api('/api/cash-shifts/current/movements', {
          method: 'POST',
          body: JSON.stringify({
            direction,
            method,
            amount: Number(amount),
            category: category || null,
            note: note || null,
          }),
        }),
        {
          loading: 'Guardando movimiento…',
          success: 'Movimiento registrado',
          error: 'No se pudo registrar el movimiento',
        }
      );

      emitShiftChanged();
      onDone?.();
      onClose?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !loading && onClose?.()}
      title="Nuevo movimiento"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border bg-white" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            className={`px-3 py-2 rounded-lg border bg-gray-900 text-white ${!canSave ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={save}
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Tipo</label>
            <select className="block w-full rounded-lg border p-2 bg-white" value={direction} onChange={(e) => setDirection(e.target.value)} disabled={loading}>
              {DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Caja</label>
            <select className="block w-full rounded-lg border p-2 bg-white" value={method} onChange={(e) => setMethod(e.target.value)} disabled={loading}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Monto</label>
            <input type="number" className="block w-full rounded-lg border p-2" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={loading} placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Categoría (opcional)</label>
            <input className="block w-full rounded-lg border p-2" value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading} placeholder="GASTO / RETIRO / AJUSTE" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500">Nota (opcional)</label>
          <input className="block w-full rounded-lg border p-2" value={note} onChange={(e) => setNote(e.target.value)} disabled={loading} placeholder="Ej: compra de insumos" />
        </div>
      </div>
    </Modal>
  );
}
