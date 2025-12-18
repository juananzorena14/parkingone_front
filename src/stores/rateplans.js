import { create } from 'zustand';
import { api } from '@/lib/api';

export const useData = create((set, get) => ({
  rateplans: [],
  loadingRp: false,
  errorRp: '',
  fetchRateplans: async (opts = { force: false }) => {
    const { rateplans, loadingRp } = get();
    if (loadingRp) return;
    if (rateplans.length && !opts.force) return; // cache en memoria

    set({ loadingRp: true, errorRp: '' });
    try {
      // si seguís viendo 304, deja activado el cache-buster en api.js
      const rows = await api('/rateplans');
      set({ rateplans: rows });
    } catch (e) {
      set({ errorRp: String(e.message || e) });
    } finally {
      set({ loadingRp: false });
    }
  },
  clear: () => set({ rateplans: [] }),
}));
