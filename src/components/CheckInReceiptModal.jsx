import Modal from './Modal';
import { QRCodeCanvas } from 'qrcode.react';

export default function CheckInReceiptModal({ open, onClose, data }) {
  // data: respuesta completa del POST /tickets (incluye entryCode + datos de rateplan)
  const configuredBase = import.meta.env.VITE_PUBLIC_TICKET_URL || import.meta.env.VITE_API_URL || location.origin;
  let PUBLIC_BASE = configuredBase;
  try { PUBLIC_BASE = new URL(configuredBase).origin; } catch { /* ignore */ }

  const url = data?.entryCode
    ? `${PUBLIC_BASE}/public/receipt.html?code=${encodeURIComponent(data.entryCode)}`
    : '';

  function print(){ window.print(); }
  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  }
  async function copyCode() {
    if (!data?.entryCode) return;
    await navigator.clipboard.writeText(String(data.entryCode));
  }

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
        <div className="printable">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">Comprobante de ingreso</div>
              <div className="text-lg font-semibold">Ticket #{data.id}</div>
              <div className="mt-1 text-sm">
                <span className="text-gray-500">Código:</span>{' '}
                <span className="font-mono font-semibold tracking-wider">{data.entryCode}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex items-center justify-center py-2">
                <QRCodeCanvas
                  value={url || JSON.stringify({
                    t: 'parking.ticket.v1',
                    code: data?.entryCode,
                    id: data?.id,
                    plate: data?.plate,
                    checkInAt: data?.checkInAt,
                  })}
                  size={180}
                  includeMargin
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Patente</div>
                    <div className="font-semibold">{data.plate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Vehículo</div>
                    <div className="font-semibold">{data.vehicleType}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Ingreso</div>
                  <div className="font-medium">{new Date(data.checkInAt).toLocaleString('es-AR')}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Tarifa</div>
                  <div className="font-medium">{data.rateName}</div>
                </div>

                <ul className="text-xs text-gray-600 list-disc pl-4">
                  {data.perHour != null && <li>Por hora: ${Number(data.perHour).toFixed(0)}</li>}
                  {data.per30min != null && <li>Cada 30’: ${Number(data.per30min).toFixed(0)}</li>}
                  {data.per15min != null && <li>Cada 15’: ${Number(data.per15min).toFixed(0)}</li>}
                  {data.toleranceMin ? <li>Tolerancia: {data.toleranceMin} min</li> : null}
                  {data.nightFlat ? (
                    <li>
                      Noche: ${Number(data.nightFlat).toFixed(0)}{' '}
                      {data.nightStartsAt != null && data.nightEndsAt != null
                        ? `(de ${data.nightStartsAt}:00 a ${data.nightEndsAt}:00)`
                        : ''}
                    </li>
                  ) : null}
                </ul>

                {url && (
                  <div className="text-xs">
                    <div className="text-gray-500">Link público (QR):</div>
                    <div className="font-mono break-all">{url}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded-lg border bg-white" onClick={copyCode} type="button">Copiar código</button>
                  {url && (
                    <>
                      <button className="px-3 py-1.5 rounded-lg border bg-white" onClick={copyLink} type="button">Copiar link</button>
                      <a className="px-3 py-1.5 rounded-lg border bg-white" href={url} target="_blank" rel="noreferrer">Abrir</a>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-gray-500">
                  Conservá este comprobante. El total se confirma al checkout.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
