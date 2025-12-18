import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '@/lib/api';
import { useData } from '@/stores/rateplans';
import { notify } from '@/lib/toast';

const PLATE_RE = /^[A-Z0-9-]{5,10}$/;

export default function CheckInModal({ open, onClose, onDone }) {
  const { rateplans, fetchRateplans, loadingRp, errorRp } = useData();

  const [plate, setPlate] = useState('');
  const [ratePlanId, setRatePlanId] = useState(null);
  const [abonado, setAbonado] = useState(null);   // { abonado, pastDue }

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Reset + cargar tarifas al abrir
  useEffect(() => {
    if (!open) return;
    setPlate('');
    setRatePlanId(null);
    fetchRateplans();
    setAbonado(null);
    setErr("");
    setLoading(false)
  }, [open, fetchRateplans]);

  // Lookup abonado al salir del input o al cambiar la patente con debounce simple
  async function checkAbonado(p){
    const x = (p ||'').trim().toUpperCase();
    if (!PLATE_RE.test(x)) { 
      setAbonado(null); 
      return; 
    } try {
      const data = await api(`/subscribers/lookup/by-plate?plate=${encodeURIComponent(x)}`);
      setAbonado(data);  // { abonado:{...}, pastDue:bool }
    } catch { 
      setAbonado(null); 
    }
  }

  // Elegir primera tarifa disponible por defecto
  useEffect(() => {
    if (!open) return;
    if (rateplans.length && ratePlanId == null) setRatePlanId(rateplans[0].id);
  }, [open, rateplans, ratePlanId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const p = plate.trim().toUpperCase();
    if (!PLATE_RE.test(p)) return alert('Patente inválida.');

    try{
      setLoading(true);
      setErr('');

      // Si es abonado → check-in simplificado (sin rateplan)
      if (abonado?.abonado) {
        const t = await api('/tickets', {
          method:'POST',
          body: JSON.stringify({
            plate: p,
            vehicleType: abonado.abonado.vehicleType, // usamos tipo de su ficha
            // ratePlanId: null (server ignora)
          })
        });
        onDone?.(t); 
        onClose?.(); 
        return;
      }

    //tarifa normal
    const rp = rateplans.find(r => r.id === Number(ratePlanId));
    if (!rp) return alert('Elegí una tarifa.');

    const t = await api('/tickets', {
      method: 'POST',
      body: JSON.stringify({ 
        plate: p, 
        vehicleType: rp.vehicleType, 
        ratePlanId: rp.id 
      })
    });
    notify.ok('Ingreso registrado');
    onDone?.(t);
    onClose?.();
    }catch(e){
      setErr(String(e.message || e))
    }finally{
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo ingreso (Check-in)"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" className="px-3 py-2 rounded-lg border bg-white" onClick={onClose}>
            Cancelar
          </button>
          <button form="checkin-form" type="submit" className={`px-3 py-2 rounded-lg border bg-gray-900 text-white ${loading ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={loading} >
            {loading ? "Creando..." : "Confirmar"}
          </button>
        </div>
      }
    >
      <form id="checkin-form" onSubmit={handleSubmit} className="space-y-4">
        {errorRp && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2">{errorRp}</div>}
        {err && <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-2">{err}</div>}

        <div>
          <label className="text-sm">Patente</label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            placeholder="AB123CD"
            value={plate}
            onChange={e => setPlate(e.target.value)}
            onBlur={e=>checkAbonado(e.target.value)}
            autoFocus
            required
            disabled={loadingRp || loading}
          />
        </div>

        {!abonado?.abonado && (
          <div>
            <label className="text-sm">Tarifa</label>
            <select
              className="mt-1 w-full rounded-lg border p-2 bg-white"
              value={ratePlanId ?? ''}
              onChange={(e) => setRatePlanId(Number(e.target.value))}
              disabled={loadingRp || loading || rateplans.length === 0}
            >
              <option value="" disabled>
                Elegir tarifa…
              </option>
              {rateplans.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {abonado?.abonado && (
          <div className={`text-sm rounded-lg border p-2 ${abonado.pastDue ? 'border-yellow-300 bg-yellow-50 text-yellow-800' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {abonado.pastDue ? '⚠️ Abonado con cuota vencida. Se permite ingreso pero sin facturación.' : '✅ Abonado activo: el ticket no tendrá cargo.'}
          </div>
        )}
        
      </form>
    </Modal>
  );
}
