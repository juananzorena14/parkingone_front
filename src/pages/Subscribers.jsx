import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import NewSubscriberModal from '@/components/NewSubscriberModal';
import EditSubscriberModal from '@/components/EditSubscriberModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { CircleDollarSign, PencilLine, Trash2 } from 'lucide-react';
import ChargeSubscriptionModal from '@/components/subscribers/ChargeSubscriptionModal';
import Pagination from '@/components/Pagination';
import { notify } from '@/lib/toast';

function Pill({ variant = 'outline', children }) {
  const base = 'inline-flex items-center rounded-full w-12 px-2 py-0.5 text-xs font-medium';
  const styles =
    variant === 'success' ? 'bg-green-100 text-green-800'
    : variant === 'warning' ? 'bg-amber-100 text-amber-800'
    : 'border border-gray-300 text-gray-700';
  return <span className={`${base} ${styles}`}>{children}</span>;
}

export default function Subscribers(){
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [total, setTotal] = useState(0);

  const [openCreate, setOpenCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [delRow, setDelRow] = useState(null);
  const [chargeRow, setChargeRow] = useState(null)

  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR',{ style:'currency', currency:'ARS', maximumFractionDigits:0 }),
    []
  );

  async function load(){
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    qs.set('page', String(page));
    qs.set('size', String(size));
    // ejemplo de sort default
    qs.set('sort', 'createdAt'); qs.set('dir','DESC');
    const res = await api(`/subscribers?${qs.toString()}`);
    const data = res.data || res; // compat si backend viejo
    setItems(data.data || data);
    setTotal(data.total ?? (data.data ? data.data.length : (Array.isArray(data)? data.length : 0)));
  }

  useEffect(()=>{ load() },[page, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Abonados</h1>
        <div className="flex items-center gap-2">
          <input className="rounded-lg shadow-md p-2 bg-white" placeholder="Buscar" value={q} onChange={e=>setQ(e.target.value)} />
          <button onClick={() => {setPage(1); load()}} className="px-3 py-2 rounded-lg shadow-md bg-white">Buscar</button>
          <button onClick={()=>setOpenCreate(true)} className="px-3 py-2 rounded-lg shadow-md bg-white">Nuevo</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-md bg-white">
        <table className="min-w-full text-sm">
          <thead className="">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Patente</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Plan</th>
              <th className="p-2 text-left">Precio</th>
              <th className="p-2 text-left">Próximo venc.</th>
              <th className="p-2 text-left">Estado</th>
              <th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s=>(
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.id}</td>
                <td className="p-2">{s.plate}</td>
                <td className="p-2">{s.fullName || '—'}</td>
                <td className="p-2">{s.planName || '—'}</td>
                <td className="p-2">{s.priceMonthly != null ? fmt.format(Number(s.priceMonthly||0)) : '—'}</td>
                <td className="p-2">
                  {s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : '—'}
                </td>
                <td className="p-2">
                  {s.isDue != null ? (
                    s.isDue ? <Pill variant="warning">Debe</Pill> : <Pill variant="success">Al día</Pill>
                  ) : (
                    // fallback si tu backend viejo devuelve subStatus/status
                    <span className={`px-2 py-1 rounded text-xs ${
                      s.subStatus==='PAST_DUE' ? 'bg-red-100 text-red-700' :
                      s.subStatus==='ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {s.subStatus || s.status || '-'}
                    </span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      title="Cobrar suscripción"
                      onClick={() => setChargeRow(s)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 transition"
                    >
                      <CircleDollarSign className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      title="Editar abonado"
                      onClick={() => setEditRow(s)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition"
                    >
                      <PencilLine className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      title="Eliminar abonado"
                      onClick={() => setDelRow(s)}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-200 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-4" colSpan={8}>Sin abonados</td></tr>}
          </tbody>
        </table>
        <Pagination page={page} size={size} total={total} onPage={setPage} />
      </div>
      
      {/* Modal: alta */}
      <NewSubscriberModal
        open={openCreate}
        onClose={()=>setOpenCreate(false)}
        onDone={()=>{ setOpenCreate(false); load(); }}
      />

      {/* Modal: editar */}
      {editRow && (
        <EditSubscriberModal
          open={!!editRow}
          data={editRow}
          onClose={()=>setEditRow(null)}
          onDone={()=>{ setEditRow(null); load(); }}
        />
      )}

      {/* Modal: eliminar */}
      {delRow && (
        <ConfirmDeleteModal
          open={!!delRow}
          data={delRow}
          onClose={()=>setDelRow(null)}
          onConfirm={async () => {
            await notify.promise(
              api(`/subscribers/${delRow.id}`, { method:'DELETE' }),
              { loading:'Eliminando…', success:'Abonado eliminado', error:'No se pudo eliminar' },
              setDelRow(null),
              load()
            ) 
          }}
        />
      )}

      {/* Modal: pagar */}
      {chargeRow && (
        <ChargeSubscriptionModal
          open={!!chargeRow}
          data={chargeRow}
          onClose={()=>setChargeRow(null)}
          onDone={()=>{ setChargeRow(null); load(); }}
        />
      )}
    </div>
  );
}
