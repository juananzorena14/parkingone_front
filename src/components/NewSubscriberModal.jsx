import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';

export default function NewSubscriberModal({ open, onClose, onDone }) {
  const [form, setForm] = useState({
    fullName:'', plate:'', vehicleType:'CAR',
    priceMonthly:0, startDate:'', phone:'', email:''
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ fullName:'', plate:'', vehicleType:'CAR', priceMonthly:0, startDate:'', phone:'', email:'' });
      setBusy(false); setErr('');
    }
  }, [open]);

  if (!open) return null;

  async function create(e){
    e.preventDefault();
    setErr('');
    try{
      setBusy(true);
      const body = { ...form, planName:'Mensual' };
      await api('/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body),
      }),
      notify.ok('Abonado creado');
      onDone && onDone();
    }catch(e){ 
      notify.err(e.message || e);
      setErr(String(e.message || e)); }
    finally{ setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Nuevo abonado</div>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        {err && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2">{err}</div>}

        <form onSubmit={create} className="space-y-2">
          <input className="w-full rounded-lg border p-2" placeholder="Nombre completo"
                 value={form.fullName} onChange={e=>setForm(f=>({...f, fullName:e.target.value}))}/>
          <input className="w-full rounded-lg border p-2" placeholder="Patente"
                 value={form.plate} onChange={e=>setForm(f=>({...f, plate:e.target.value.toUpperCase()}))}/>
          <input className="w-full rounded-lg border p-2" placeholder="Teléfono"
                 value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))}/>
          <input className="w-full rounded-lg border p-2" placeholder="Email"
                 value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))}/>
          <select className="w-full rounded-lg border p-2 bg-white"
                  value={form.vehicleType} onChange={e=>setForm(f=>({...f, vehicleType:e.target.value}))}>
            <option value="CAR">Auto</option>
            <option value="MOTORCYCLE">Moto</option>
            <option value="PICKUP">Camioneta</option>
            
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input className="rounded-lg border p-2" placeholder="Precio mensual" type="number" min="0" step="1"
              value={form.priceMonthly} onChange={e=>setForm(f=>({...f, priceMonthly:e.target.value}))}/>
            <input className="rounded-lg border p-2" placeholder="Inicio (AAAA-MM-DD)"
              value={form.startDate} onChange={e=>setForm(f=>({...f, startDate:e.target.value}))}/>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border bg-white" disabled={busy}>Cancelar</button>
            <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white disabled:opacity-60" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
