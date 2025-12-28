import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { QRCodeCanvas } from 'qrcode.react';
import { API, api } from '@/lib/api';

export default function CheckInReceiptModal({ open, onClose, data }) {
  // data: ticket (ideal) o response wrapper { ok, data } (back-compat)
  const t = data?.data || data?.ticket || data;
  const printQrWrapRef = useRef(null);

  const [parking, setParking] = useState({ name: 'ESTACIONAMIENTO', phone: '', direction: '' });
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const s = await api('/settings').catch(() => null);
        const row = s?.data || s;
        if (!on || !row) return;
        setParking({
          name: row.parking_name || row.parkingName || row.name || 'ESTACIONAMIENTO',
          phone: row.phone || '',
          direction: row.direction || '',
        });
      } catch {
        // ignore
      }
    })();
    return () => { on = false; };
  }, []);

  // Prefer backend origin for QR/public receipt.
  // API already falls back to http://localhost:3001 in dev.
  const configuredBase = import.meta.env.VITE_PUBLIC_TICKET_URL || import.meta.env.VITE_API_URL || API || location.origin;
  let PUBLIC_BASE = configuredBase;
  try { PUBLIC_BASE = new URL(configuredBase).origin; } catch { /* ignore */ }

  const url = t?.entryCode
    ? `${PUBLIC_BASE}/public/receipt.html?code=${encodeURIComponent(t.entryCode)}`
    : '';

  function print() {
    if (!t) return;

    // Try to export QR canvas as PNG and print in a dedicated window
    let qrDataUrl = '';
    try {
      const canvas = printQrWrapRef.current?.querySelector?.('canvas');
      if (canvas?.toDataURL) qrDataUrl = canvas.toDataURL('image/png');
    } catch {
      // ignore
    }

    const safe = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Ticket #${t.id}</title>
  <style>
    @page { margin: 4mm; }
    body { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; color:#000; }
    .ticket { width: 58mm; margin: 0 auto; font-size: 11px; }
    .title { text-align:center; font-weight:800; font-size: 13px; margin:2px 0; }
    .sub { text-align:center; font-size:10px; margin-bottom:6px; }
    .meta { text-align:center; font-size:10px; margin-bottom:6px; }
    .row { display:flex; justify-content:space-between; gap:8px; margin:2px 0; }
    .plate { font-size: 13px; letter-spacing:1px; }
    .code { letter-spacing:1px; }
    .sep { text-align:center; margin:6px 0; }
    .label { font-size: 10px; }
    .muted { font-size: 10px; text-align:center; }
    .qr { display:grid; place-items:center; margin:6px 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="title">${safe(parking.name || 'ESTACIONAMIENTO')}</div>
    ${(parking.direction || parking.phone)
      ? `<div class="meta">${safe(parking.direction || '')}${parking.phone ? ` · Tel: ${safe(parking.phone)}` : ''}</div>`
      : ''}
    <div class="sub">Comprobante de ingreso</div>

    <div class="row"><span>Entrada</span><b>${safe(fmtDateTime(t.checkInAt))}</b></div>
    <div class="row"><span>Patente</span><b class="plate">${safe(t.plate)}</b></div>
    <div class="row"><span>Ticket</span><b>#${safe(t.id)}</b></div>
    <div class="row"><span>Código</span><b class="code">${safe(t.entryCode)}</b></div>

    <div class="sep">------------------------------</div>
    <div class="label">Tarifa</div>
    <div><b>${safe(t.rateName)}</b></div>
    ${tariffLine() ? `<div class="muted">${safe(tariffLine())}</div>` : ''}

    <div class="sep">------------------------------</div>
    <div class="muted"><b>NO PERDER ESTE TICKET</b></div>
    <div class="muted">Presentá el ticket en caja al salir.</div>
    <div class="muted">El monto final se confirma en caja.</div>

    <div class="qr">${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width: 38mm" />` : ''}</div>
    <div class="muted">Escaneá el QR para ver el tiempo y el estimado.</div>
    <div class="sep">------------------------------</div>
  </div>
  <script>
    window.onload = () => { window.focus(); window.print(); };
    window.onafterprint = () => { window.close(); };
  </script>
</body>
</html>`;

    const w = window.open('', 'pp_print', 'width=340,height=640');
    if (!w) {
      // Fallback
      window.print();
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function fmtDateTime(dt) {
    try {
      return new Date(dt).toLocaleString('es-AR', {
        year: '2-digit', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return String(dt || '');
    }
  }

  function tariffLine() {
    const parts = [];
    if (t?.perHour != null) parts.push(`$${Number(t.perHour).toFixed(0)}/h`);
    if (t?.per30min != null) parts.push(`$${Number(t.per30min).toFixed(0)}/30m`);
    if (t?.toleranceMin) parts.push(`Tol ${t.toleranceMin}m`);
    return parts.join(' · ');
  }

  async function copyLink() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
  }
  async function copyCode() {
    if (!t?.entryCode) return;
    await navigator.clipboard.writeText(String(t.entryCode));
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
      {!t ? (
        <div className="text-sm text-gray-500">Sin datos.</div>
      ) : (
        <div className="printable">
          {/* PRINT: ticket angosto y básico */}
          <div className="pp-ticket print-only">
            <div className="pp-ticket__title">ESTACIONAMIENTO</div>
            <div className="pp-ticket__sub">Comprobante de ingreso</div>

            <div className="pp-ticket__row"><span>Entrada</span><b>{fmtDateTime(t.checkInAt)}</b></div>
            <div className="pp-ticket__row"><span>Patente</span><b className="pp-ticket__plate">{t.plate}</b></div>
            <div className="pp-ticket__row"><span>Ticket</span><b>#{t.id}</b></div>
            <div className="pp-ticket__row"><span>Código</span><b className="pp-ticket__code">{t.entryCode}</b></div>

            <div className="pp-ticket__sep">------------------------------</div>
            <div className="pp-ticket__label">Tarifa</div>
            <div className="pp-ticket__value"><b>{t.rateName}</b></div>
            {tariffLine() ? <div className="pp-ticket__muted">{tariffLine()}</div> : null}

            <div className="pp-ticket__qr" ref={printQrWrapRef}>
              <QRCodeCanvas
                value={url || t.entryCode}
                size={150}
                includeMargin
              />
            </div>

            <div className="pp-ticket__hint">Escaneá el QR para ver el tiempo y el estimado.</div>
            <div className="pp-ticket__muted">Presentá este ticket en caja al salir.</div>
            <div className="pp-ticket__sep">------------------------------</div>
          </div>

          {/* SCREEN: card linda */}
          <div className="rounded-2xl border bg-white p-4 screen-only">
            <div className="text-center">
              <div className="text-xs text-gray-500">Comprobante de ingreso</div>
              <div className="text-lg font-semibold">Ticket #{t.id}</div>
              <div className="mt-1 text-sm">
                <span className="text-gray-500">Código:</span>{' '}
                <span className="font-mono font-semibold tracking-wider">{t.entryCode}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex items-center justify-center py-2">
                <QRCodeCanvas
                  value={url || JSON.stringify({
                    t: 'parking.ticket.v1',
                    code: t?.entryCode,
                    id: t?.id,
                    plate: t?.plate,
                    checkInAt: t?.checkInAt,
                  })}
                  size={180}
                  includeMargin
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Patente</div>
                    <div className="font-semibold">{t.plate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Vehículo</div>
                    <div className="font-semibold">{t.vehicleType}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Ingreso</div>
                  <div className="font-medium">{new Date(t.checkInAt).toLocaleString('es-AR')}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Tarifa</div>
                  <div className="font-medium">{t.rateName}</div>
                </div>

                <ul className="text-xs text-gray-600 list-disc pl-4">
                  {t.perHour != null && <li>Por hora: ${Number(t.perHour).toFixed(0)}</li>}
                  {t.per30min != null && <li>Cada 30’: ${Number(t.per30min).toFixed(0)}</li>}
                  {t.per15min != null ? <li>Cada 15’: ${Number(t.per15min).toFixed(0)}</li> : null}
                  {t.toleranceMin ? <li>Tolerancia: {t.toleranceMin} min</li> : null}
                  {t.nightFlat ? (
                    <li>
                      Noche: ${Number(t.nightFlat).toFixed(0)}{' '}
                      {t.nightStartsAt != null && t.nightEndsAt != null
                        ? `(de ${t.nightStartsAt}:00 a ${t.nightEndsAt}:00)`
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
