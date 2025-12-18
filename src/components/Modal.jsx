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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border overflow-hidden">
          {title && <div className="px-4 py-3 border-b font-semibold">{title}</div>}
          <div className="p-4">{children}</div>
          {footer && <div className="px-4 py-3 border-t bg-gray-50">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
