export default function ConfirmDeleteModal({ open, data, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-4">
        <h3 className="text-lg font-semibold mb-2">Eliminar abonado</h3>
        <p className="text-sm text-gray-600 mb-4">
          ¿Seguro querés eliminar a <b>{data?.fullName || data?.plate}</b>?<br/>
          Si tiene relaciones, se marcará como <b>INACTIVE</b>.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border bg-white">Cancelar</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-lg border bg-red-600 text-white">Eliminar</button>
        </div>
      </div>
    </div>
  );
}
