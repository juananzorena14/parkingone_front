import Modal from './Modal';
import { QRCodeCanvas } from 'qrcode.react';

export default function CheckInReceiptModal({ open, onClose, data }) {
  // data: respuesta completa del POST /tickets (incluye entryCode + datos de rateplan)
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_TICKET_URL || location.origin; 
const url = data?.entryCode 
    ? `${PUBLIC_BASE}/public/receipt.html?code=${data.entryCode}` 
    : '';
  function print(){ window.print(); }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comprobante de Ingreso"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-lg border bg-white" onClick={onClose}>Cerrar</button>
          <button className="px-3 py-2 rounded-lg border bg-gray-900 text-white" onClick={print}>Imprimir</button>
        </div>
      }
    >
      {!data ? (
        <div className="text-sm text-gray-500">Sin datos.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center printable">
          <div className="flex items-center justify-center py-2">
            <QRCodeCanvas value={url || JSON.stringify({
              t:'parking.ticket.v1',
              code:data?.entryCode,
              id:data?.id,
              plate:data?.plate,
              checkInAt:data?.checkInAt
            })} size={180} includeMargin />
          </div>
          <div className="space-y-1 text-sm">
            <div><span className="text-gray-500">Ticket #:</span> <b>{data.id}</b></div>
            <div><span className="text-gray-500">Código:</span> <b>{data.entryCode}</b></div>
            <div><span className="text-gray-500">Patente:</span> <b>{data.plate}</b></div>
            <div><span className="text-gray-500">Vehículo:</span> <b>{data.vehicleType}</b></div>
            <div><span className="text-gray-500">Ingreso:</span> <b>{new Date(data.checkInAt).toLocaleString()}</b></div>
            <div className="mt-2"><span className="text-gray-500">Tarifa:</span> <b>{data.rateName}</b></div>
            <ul className="text-xs text-gray-600 list-disc pl-4">
              {data.perHour    != null && <li>Por hora: ${Number(data.perHour).toFixed(0)}</li>}
              {data.per15min   != null && <li>Cada 15’: ${Number(data.per15min).toFixed(0)}</li>}
              {data.toleranceMin ? <li>Tolerancia: {data.toleranceMin} min</li> : null}
              {data.nightFlat  ? <li>Noche: ${Number(data.nightFlat).toFixed(0)} {data.nightStartsAt!=null && data.nightEndsAt!=null ? `(de ${data.nightStartsAt}:00 a ${data.nightEndsAt}:00)` : ''}</li> : null}
            </ul>
            <div className="text-[11px] text-gray-500 mt-2">
              Conserve este comprobante. El total se calculará al momento del checkout según la tarifa indicada.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
