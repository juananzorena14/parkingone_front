// RatePlanEditor.jsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api'; // tu mismo archivo
import { Plus } from 'lucide-react';
import { useUI } from '@/stores/ui';
import { RatePlanSkeleton } from '../skeletons/RatePlanSkeleton';

export default function RatePlanEditor() {
  const [plans, setPlans] = useState([]);
  const {loading, setLoading} = useUI();
  const [error, setError]   = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await api(`/rateplans`); // GET por defecto
      setPlans(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleChange = (id, field, value) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const save = async (plan) => {
    // asegurá números
    const payload = {
      ...plan,
      perHour: Number(plan.perHour) || 0,
      per30min: Number(plan.per30min) || 0,
      nightFlat: plan.nightFlat != null ? Number(plan.nightFlat) : null,
      toleranceMin: plan.toleranceMin != null ? Number(plan.toleranceMin) : 0,
    };
    await api(`/rateplans/${plan.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  };

  const create = async () => {
    const payload = {
      name: 'Nueva tarifa',
      vehicleType: 'auto',
      perHour: 0,
      per30min: 0,
      nightFlat: null,
      nightStartsAt: '22:00',
      nightEndsAt: '06:00',
      toleranceMin: 0,
      currency: 'ARS',
    };
    const created = await api('/rateplans', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setPlans(p => [created, ...p]);
  };

  const remove = async (id) => {
    await api(`/rateplans/${id}`, { method: 'DELETE' });
    setPlans(p => p.filter(x => x.id !== id));
  };

  if (loading) return <RatePlanSkeleton/>;
  if (error)   return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="flex flex-row shadow-md rounded-xl p-2 bg-white" onClick={create}><Plus className='w-4 h-3 mt-1.5'/> Nueva tarifa </button>
      </div>

      {plans.map(p => (
        <div key={p.id} className="shadow-md p-3 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-2 bg-white">
          <div>
            <label className="block text-xs text-gray-500">Nombre</label>
            <input className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.name} onChange={e=>handleChange(p.id,'name',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">$/hora</label>
            <input type="number" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.perHour ?? 0}
              onChange={e=>handleChange(p.id,'perHour',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">$/30 min</label>
            <input type="number" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.per30min ?? 0}
              onChange={e=>handleChange(p.id,'per30min',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tarifa nocturna (flat)</label>
            <input type="number" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.nightFlat ?? ''}
              onChange={e=>handleChange(p.id,'nightFlat',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Noche: desde</label>
            <input type="time" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.nightStartsAt ?? '22:00'}
              onChange={e=>handleChange(p.id,'nightStartsAt',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Noche: hasta</label>
            <input type="time" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.nightEndsAt ?? '06:00'}
              onChange={e=>handleChange(p.id,'nightEndsAt',e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Tolerancia (min)</label>
            <input type="number" className="shadow-md rounded-lg px-2 py-1 w-full"
              value={p.toleranceMin ?? 0}
              onChange={e=>handleChange(p.id,'toleranceMin',e.target.value)} />
          </div>

          <div className="col-span-2 flex gap-2 mt-2">
            <button className="shadow-md rounded-lg px-3 py-1" onClick={()=>save(p)}>Guardar</button>
            <button className="shadow-md rounded-lg px-3 py-1 text-red-600" onClick={()=>remove(p.id)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );
}
