import { api } from "@/lib/api";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { notify } from "@/lib/toast";
import { emitShiftChanged } from "@/lib/shiftEvents";

export function CloseShiftButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="rounded-lg shadow-md px-3 py-1 bg-white" onClick={()=>setOpen(true)}>Cerrar turno</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center pp-fade-in">
          <div className="bg-white p-4 rounded-xl w-full max-w-sm space-y-3 pp-pop-in">
            <h3 className="text-lg font-semibold">Cierre de turno</h3>
            <div className="text-sm text-gray-600">
              El cierre se calcula automáticamente con los movimientos del turno.
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={()=>setOpen(false)}>Cancelar</button>
              <button className="px-3 py-1 border rounded bg-gray-900 text-white"
                onClick={async ()=>{
                  await notify.promise(
                    api('/api/cash-shifts/close', {
                      method:'POST',
                      body: JSON.stringify({})
                    }),
                    {
                      loading: 'Cerrando turno…',
                      success: 'Turno cerrado',
                      error: 'No se pudo cerrar el turno',
                    }
                  );
                  setOpen(false);
                  emitShiftChanged();
                  // Vuelve al dashboard (sin exponer reportes a roles sin permiso)
                  navigate('/');
                }}>
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
