import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    function onKey(e){ if (e.key === 'Escape') onClose?.(); }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* dialog */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute top-2 right-2 rounded-lg p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <span className="text-xl leading-none">×</span>
          </button>
          {title && <div className="px-4 py-3 border-b font-semibold shrink-0 pr-12">{title}</div>}
          <div className="p-4 overflow-y-auto min-h-0">{children}</div>
          {footer && <div className="px-4 py-3 border-t bg-gray-50 shrink-0">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
