const EVT = 'cashshift:changed';

export function emitShiftChanged() {
  window.dispatchEvent(new Event(EVT));
}

export function onShiftChanged(handler) {
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
