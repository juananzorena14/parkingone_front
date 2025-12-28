import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { notify } from '@/lib/toast';
import { useAuth } from '@/stores/auth';

const METHODS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'DEBIT', label: 'Débito' },
  { value: 'CREDIT', label: 'Crédito' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

const TYPES = [
  { value: 'ALL', label: 'Todos' },
  { value: 'TICKET', label: 'Ticket' },
  { value: 'SUBSCRIPTION', label: 'Suscripción' },
  { value: 'OTHER', label: 'Otro' },
];

export default function PaymentsTableServer({ title = 'Movimientos', initialPage = 1, pageSize = 10, defaultMethod = 'ALL', defaultType = 'ALL' }) {
  const [items, setItems] = useState([]);

  const user = useAuth((s) => s.user);
  const canManage = ['ADMIN', 'SUPERVISOR'].includes(String(user?.role || '').toUpperCase());

  const [openReverse, setOpenReverse] = useState(false);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [reverseReason, setReverseReason] = useState('');

  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editMethod, setEditMethod] = useState('CASH');
  const [editExternalId, setEditExternalId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [method, setMethod] = useState(defaultMethod);
  const [type, setType] = useState(defaultType);

  const [page, setPage] = useState(initialPage);
  const [size, setSize] = useState(pageSize);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits:0 }),
    []
  );


  function openReverseFor(p) {
    setReverseTarget(p);
    setReverseReason('');
    setOpenReverse(true);
  }

  function openEditFor(p) {
    setEditTarget(p);
    setEditMethod(String(p?.method || 'CASH').toUpperCase());
    setEditExternalId(p?.externalId == null ? '' : String(p.externalId));
    setEditNote(p?.note == null ? '' : String(p.note));
    setOpenEdit(true);
  }

  async function confirmReverse() {
    const p = reverseTarget;
    const reason = String(reverseReason || '').trim();
    if (!p?.id) return;
    if (!reason) return notify.err('Ingresá un motivo');

    try {
      await api(`/payments/${p.id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      notify.ok('Pago reversado');
      setOpenReverse(false);
      setReverseTarget(null);
      load();
    } catch (e) {
      notify.err(e?.message || 'No se pudo reversar');
    }
  }

  async function confirmEdit() {
    const p = editTarget;
    if (!p?.id) return;

    try {
      await api(`/payments/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          method: editMethod,
          externalId: editExternalId,
          note: editNote,
        }),
      });
      notify.ok('Pago actualizado');
      setOpenEdit(false);
      setEditTarget(null);
      load();
    } catch (e) {
      notify.err(e?.message || 'No se pudo actualizar');
    }
  }

  async function load(){
    setErr(''); setLoading(true);
    try{
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to)   qs.set('to', to);
      if (method && method !== 'ALL') qs.set('method', method);
      if (type && type !== 'ALL')     qs.set('type', type);
      qs.set('page', String(page));
      qs.set('size', String(size));

      const res = await api(`/payments?${qs.toString()}`);
      const payload = res.ok ? res : { ok:true, data: res.data || res, total: res.total ?? 0, page: res.page ?? page, size: res.size ?? size };
      setItems(payload.data || []);
      setTotal(payload.total || 0);
    }catch(e){
      setErr(String(e.message || e));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load() /* on mount */ }, []);
  useEffect(()=>{ load() /* when filters or page change */ }, [from, to, method, type, page, size]);

  function applyNow(){
    setPage(1);
    load();
  }

  return (
    <div className="rounded-2xl bg-white p-4 space-y-3 shadow-md">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="text-xs text-gray-500">Desde</label>
            <input type="date" className="block w-40 rounded-lg border p-2" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Hasta</label>
            <input type="date" className="block w-40 rounded-lg border p-2" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Método</label>
            <select className="block w-44 rounded-lg border p-2 bg-white" value={method} onChange={e=>{ setMethod(e.target.value); setPage(1); }}>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Tipo</label>
            <select className="block w-44 rounded-lg border p-2 bg-white" value={type} onChange={e=>{ setType(e.target.value); setPage(1); }}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Tamaño</label>
            <select className="block w-28 rounded-lg border p-2 bg-white" value={size} onChange={e=>{ setSize(Number(e.target.value)); setPage(1); }}>
              {[10,20,50,100].map(n => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
          </div>
          <button onClick={applyNow} className="px-3 py-2 rounded-lg border bg-white">{loading ? 'Cargando…' : 'Aplicar'}</button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="">
            <tr>
              <th className="p-2 text-left">Fecha</th>
              <th className="p-2 text-left">Tipo</th>
              <th className="p-2 text-left">Referencia</th>
              <th className="p-2 text-left">Método</th>
              <th className="p-2 text-right">Monto</th>
              <th className="p-2 text-left">Usuario</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-left">Nota</th>
              {canManage && <th className="p-2 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(p => {
              const isReversal = Boolean(p.isReversal || p.reversesPaymentId);
              const isReversed = Boolean(p.isReversed || p.reversalId);
              const disableActions = isReversal || isReversed;

              return (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      p.kind==='SUBSCRIPTION' ? 'bg-amber-100 text-amber-800' :
                      p.kind==='TICKET' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {p.kind==='SUBSCRIPTION' ? 'Suscripción' : p.kind==='TICKET' ? 'Ticket' : 'Otro'}
                    </span>
                  </td>
                  <td className="p-2">{p.ref || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      p.method==='DEBIT' ? 'bg-amber-100 text-amber-800' :
                      p.method==='CREDIT' ? 'bg-fuchsia-100 text-fuchsia-800' :
                      p.method==='CASH' ? 'bg-indigo-100 text-indigo-800' :
                      p.method==="TRANSFER" ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.method==='DEBIT' ? 'Débito' : p.method==='CREDIT' ? 'Crédito' : p.method==='CASH' ? 'Efectivo' : p.method==="TRANSFER" ? 'Transferencia' : "Otro"}
                    </span>
                  </td>
                  <td className={`p-2 text-right ${isReversal ? 'text-red-700' : ''}`}>{fmt.format(p.amount || 0)}</td>
                  <td className="p-2">{p.userName || p.createdBy || '-'}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {isReversal && <span className="px-2 py-1 rounded-lg text-xs bg-red-100 text-red-800">Reverso</span>}
                      {isReversed && <span className="px-2 py-1 rounded-lg text-xs bg-gray-100 text-gray-700">Reversado</span>}
                    </div>
                  </td>
                  <td className="p-2">{p.note || '-'}</td>
                  {canManage && (
                    <td className="p-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className={`px-2 py-1 rounded-lg border bg-white text-xs ${disableActions ? 'opacity-60 cursor-not-allowed' : ''}`}
                          disabled={disableActions}
                          onClick={() => openEditFor(p)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 rounded-lg border bg-gray-900 text-white text-xs ${disableActions ? 'opacity-60 cursor-not-allowed' : ''}`}
                          disabled={disableActions}
                          onClick={() => openReverseFor(p)}
                        >
                          Reversar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {!items.length && (
              <tr><td className="p-3 text-gray-500" colSpan={canManage ? 9 : 8}>Sin pagos para el filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} size={size} total={total} onPage={setPage} />

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
          <div className="text-xs text-gray-500">Se creará un pago negativo (quedan ambos en el historial).</div>
          <div>
            <label className="text-xs text-gray-500">Motivo</label>
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Ej: cobro duplicado"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title={editTarget ? `Editar pago #${editTarget.id}` : 'Editar pago'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-lg border bg-white" onClick={() => setOpenEdit(false)}>
              Cancelar
            </button>
            <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={confirmEdit}>
              Guardar
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Método</label>
            <select className="mt-1 block w-full rounded-lg border p-2 bg-white" value={editMethod} onChange={(e) => setEditMethod(e.target.value)}>
              {METHODS.filter(m => m.value !== 'ALL').map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">External ID (opcional)</label>
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              value={editExternalId}
              onChange={(e) => setEditExternalId(e.target.value)}
              placeholder="Ej: MP-123 / transferencia"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Nota (opcional)</label>
            <input
              className="mt-1 block w-full rounded-lg border p-2"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
            />
          </div>
          <div className="text-xs text-gray-500">No se modifica el monto desde acá. Para corregir monto: reversar + cobrar correcto.</div>
        </div>
      </Modal>
    </div>
  );
}
