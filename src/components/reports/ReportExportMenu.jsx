import { useEffect, useRef, useState, useMemo } from "react";

/* ------- CSV utils (internos al componente) ------- */
function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    const needsQuotes = /[",\n;]/.test(s);
    const ss = s.replace(/"/g, '""');
    return needsQuotes ? `"${ss}"` : ss;
  };
  const head = headers.map(h => esc(h.label)).join(";");
  const body = rows.map(r => headers.map(h => esc(h.get(r))).join(";")).join("\n");
  return head + "\n" + body;
}

function downloadCSV(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ReportExportMenu
 * Props:
 *  - from, to, method
 *  - summary: { total, count, avgTicket, avgMinutes }
 *  - byMethod: [{ method, total, count }]
 *  - daily: [{ date, total, count }]
 *  - disabled?: boolean (opcional)
 */
export default function ReportExportMenu({ from, to, method, summary, byMethod, daily, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // click fuera para cerrar
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const hasData = useMemo(() => {
    return !!(summary && (summary.total || summary.count) || byMethod?.length || daily?.length);
  }, [summary, byMethod, daily]);

  function exportResumen() {
    const headers = [
      { label: "Desde",            get: () => from },
      { label: "Hasta",            get: () => to },
      { label: "Método",           get: () => method },
      { label: "Total",            get: () => summary?.total ?? 0 },
      { label: "Tickets",          get: () => summary?.count ?? 0 },
      { label: "PromedioTicket",   get: () => summary?.avgTicket ?? 0 },
      { label: "PromedioMinutos",  get: () => summary?.avgMinutes ?? 0 },
    ];
    const csv = toCSV([summary || {}], headers);
    downloadCSV(`resumen_${from}_a_${to}_${method}.csv`, csv);
    setOpen(false);
  }

  function exportByMethod() {
    const headers = [
      { label: "Método",   get: (r) => r.method },
      { label: "Cantidad", get: (r) => r.count ?? 0 },
      { label: "Total",    get: (r) => r.total ?? 0 },
    ];
    const csv = toCSV(byMethod || [], headers);
    downloadCSV(`por_metodo_${from}_a_${to}.csv`, csv);
    setOpen(false);
  }

  function exportDaily() {
    const headers = [
      { label: "Fecha",    get: (r) => r.date },
      { label: "Cantidad", get: (r) => r.count ?? 0 },
      { label: "Total",    get: (r) => r.total ?? 0 },
    ];
    const csv = toCSV(daily || [], headers);
    downloadCSV(`diario_${from}_a_${to}_${method}.csv`, csv);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`px-3 py-2 rounded-xl shadow bg-white text-m ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        disabled={disabled}
      >
        Exportar
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg overflow-hidden z-50">
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm disabled:text-gray-400"
            onClick={exportResumen}
            disabled={!summary}
          >
            Resumen (KPI)
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm disabled:text-gray-400"
            onClick={exportByMethod}
            disabled={!byMethod?.length}
          >
            Por método
          </button>
          <button
            type="button"
            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm disabled:text-gray-400"
            onClick={exportDaily}
            disabled={!daily?.length}
          >
            Diario
          </button>

          {!hasData && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t">
              No hay datos para exportar
            </div>
          )}
        </div>
      )}
    </div>
  );
}
