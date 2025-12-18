export function CloseShiftButton() {
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="border rounded px-3 py-1" onClick={()=>setOpen(true)}>Cerrar turno</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white p-4 rounded-xl w-full max-w-sm space-y-3">
            <h3 className="text-lg font-semibold">Cierre de turno</h3>
            <input type="number" className="border rounded px-2 py-1 w-full"
                   placeholder="Efectivo contado"
                   value={amount} onChange={e=>setAmount(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={()=>setOpen(false)}>Cancelar</button>
              <button className="px-3 py-1 border rounded bg-gray-900 text-white"
                onClick={async ()=>{
                  await api('/api/cash-shifts/close', { method:'POST', body: JSON.stringify({ closingCash: Number(amount||0) }) });
                  setOpen(false);
                  // opcional: refrescar KPIs/tabla
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
