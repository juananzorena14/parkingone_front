// ShiftGate.jsx
import { useEffect, useMemo, useState } from 'react';
import { Wallet, Lock, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { notify } from '@/lib/toast';
import { emitShiftChanged, onShiftChanged } from '@/lib/shiftEvents';
import { getUser } from '@/lib/auth';

export default function ShiftGate({ children }) {
  // Solo tiene sentido gatear si hay sesión (token). Si no hay token (ej: /login),
  // NO debemos llamar a endpoints protegidos porque el 401 rompe la app.
  // Nota: lo leemos en cada render para evitar quedarnos con un token viejo.
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const shouldGate = Boolean(token);

  const [shift, setShift] = useState(undefined); // undefined: cargando, null: no hay
  const [openingCash, setOpeningCash] = useState('');
  const [opening, setOpening] = useState(false);

  const user = useMemo(() => getUser(), []);
  const fmt = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    []
  );

  async function refreshCurrentShift() {
    setShift(undefined);
    try {
      const cur = await api('/api/cash-shifts/current');
      setShift(cur);
    } catch {
      // Si hay token y falla (no es 401 en login), asumimos que no hay turno abierto
      // y mostramos el modal de apertura.
      setShift(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!shouldGate) return;

    (async () => {
      try {
        await refreshCurrentShift();
      } finally {
        // no-op
      }
    })();

    const off = onShiftChanged(async () => {
      if (cancelled) return;
      await refreshCurrentShift();
    });

    return () => {
      cancelled = true;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldGate]);

  const open = async () => {
    if (!shouldGate) return;

    try {
      setOpening(true);
      await notify.promise(
        api('/api/cash-shifts/open', {
          method: 'POST',
          body: JSON.stringify({
            openingCash: Number(openingCash || 0),
            openingTransfer: 0,
          }),
        }),
        {
          loading: 'Abriendo turno…',
          success: 'Turno abierto',
          error: 'No se pudo abrir el turno',
        }
      );

      const cur = await api('/api/cash-shifts/current');
      setShift(cur);
      setOpeningCash('');
      emitShiftChanged();
    } finally {
      setOpening(false);
    }
  };

  if (!shouldGate) return children;

  if (shift === undefined) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando…</span>
        </div>
      </div>
    );
  }

  if (!shift) {
    const suggestedCash = openingCash === '' ? 0 : Number(openingCash || 0);
    const suggestedCashText = Number.isFinite(suggestedCash) ? fmt.format(suggestedCash) : '';

    return (
      <div className="fixed inset-0 bg-black/40 grid place-items-center pp-fade-in p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border pp-pop-in overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-700 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-semibold">Abrir turno de caja</div>
                <div className="text-xs text-white/80">Necesitás un turno abierto para operar</div>
              </div>
              <div className="ml-auto">
                <Lock className="w-4 h-4 text-white/80" />
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {user?.name && (
              <div className="text-sm text-gray-600">
                Operador: <span className="font-medium text-gray-900">{user.name}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Efectivo inicial</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="0"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  disabled={opening}
                />
              </div>
              {openingCash !== '' && (
                <div className="text-xs text-gray-500 mt-1">{suggestedCashText}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">Transferencia inicial: {fmt.format(0)}</div>
            </div>

            <button
              className={`w-full rounded-xl px-3 py-2 bg-gray-900 text-white ${opening ? 'opacity-70 cursor-not-allowed' : ''}`}
              onClick={open}
              disabled={opening}
            >
              {opening ? 'Abriendo…' : 'Confirmar apertura'}
            </button>

            <div className="text-xs text-gray-500">
              Cuando cierres el turno, la app vuelve a este paso.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
