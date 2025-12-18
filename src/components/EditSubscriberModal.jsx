import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';

export default function EditSubscriberModal({ open, data, onClose, onDone }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [nextDueDate, setNextDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open && data) {
      setFullName(data.fullName || '');
      setPlate(data.plate || '');
      setVehicleType(data.vehicleType || 'CAR');
      setNextDueDate(data.nextDueDate ? String(data.nextDueDate).slice(0,10) : '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setErr(''); setBusy(false);
    }
  }, [open, data]);

  if (!open) return null;

  async function save(){
    try{
      setBusy(true); setErr('');
      await notify.promise(
        api(`/subscribers/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            plate: plate?.toUpperCase(),
            vehicleType,
            nextDueDate: nextDueDate || null,
            phone,
            email
          })
        }),
        { loading:'Guardando…', success:'Cambios guardados', error:'No se pudo guardar' }
      );
      onDone && onDone();
    }catch(e){ 
      setErr(String(e.message || e)); }
    finally{ setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="w-full max-w-md bg-white rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold">Editar abonado</div>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        {err && <div className="text-sm rounded border border-red-200 bg-red-50 text-red-700 p-2 mb-2">{err}</div>}

        <div className="space-y-2">
          <input className="w-full rounded-lg border p-2" placeholder="Nombre completo"
                 value={fullName} onChange={e=>setFullName(e.target.value)} />
          <input className="w-full rounded-lg border p-2 uppercase" placeholder="Patente"
                 value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} />
          <select className="w-full rounded-lg border p-2 bg-white"
                  value={vehicleType} onChange={e=>setVehicleType(e.target.value)}>
            <option value="CAR">Auto</option>
            <option value="MOTORCYCLE">Moto</option>
            <option value="PICKUP">Camioneta</option>
            <option value="TRUCK">Camión</option>
          </select>
          <label className="block">
            <span className="text-sm text-gray-700">Próximo vencimiento</span>
            <input type="date" className="mt-1 w-full rounded-lg border p-2"
                   value={nextDueDate} onChange={e=>setNextDueDate(e.target.value)} />
          </label>
          <input className="w-full rounded-lg border p-2" placeholder="Teléfono"
                 value={phone} onChange={e=>setPhone(e.target.value)} />
          <input className="w-full rounded-lg border p-2" placeholder="Email"
                 value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border bg-white" disabled={busy}>Cancelar</button>
          <button onClick={save} className="px-3 py-2 rounded-lg border bg-gray-900 text-white disabled:opacity-60" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
