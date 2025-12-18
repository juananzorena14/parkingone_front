import { create } from 'zustand';

export const useUI = create((set) => ({
  loading: false,
  setLoading: (state) => set({ loading: state }),

  // opcional: si querés manejar varios loaders por clave
  loaders: {},
  start: (key) => set((s) => ({ loaders: { ...s.loaders, [key]: true } })),
  stop: (key) => set((s) => ({ loaders: { ...s.loaders, [key]: false } })),
}));
