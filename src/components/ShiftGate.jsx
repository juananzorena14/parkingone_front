// ShiftGate.jsx
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ShiftGate({ children }) {
  const [shift, setShift] = useState(undefined); // undefined: cargando, null: no hay
  const [openingCash, setOpeningCash] = useState('');

  useEffect(() => { api('/api/cash-shifts/current').then(setShift); }, []);

  const open = async () => {
    await api('/api/cash-shifts/open', {
      method: 'POST',
      body: JSON.stringify({ openingCash: Number(openingCash || 0) })
    });
    const cur = await api('/api/cash-shifts/current');
    setShift(cur);
  };

  if (shift === undefined) return null; // o skeleton
  if (!shift) {
    return (
      <div className="fixed inset-0 bg-black/40 grid place-items-center">
        <div className="bg-white p-4 rounded-xl w-full max-w-sm space-y-3">
          <h2 className="text-lg font-semibold">Abrir turno de caja</h2>
          <input type="number" className="border rounded px-2 py-1 w-full"
                 placeholder="Efectivo inicial"
                 value={openingCash} onChange={e=>setOpeningCash(e.target.value)} />
          <button className="border rounded px-3 py-1 w-full" onClick={open}>Confirmar</button>
        </div>
      </div>
    );
  }

  return children;
}
