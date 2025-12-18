import { create } from "zustand";

export const useAuth = create((set) => ({
  user: null,
  token: null,

  setAuth: ({user, token, remember = true}) => {
    set({user,token});
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("user", JSON.stringify(user));
    storage.setItem("token", token);

    // limpia el otro storage por si quedó algo
    (remember ? sessionStorage : localStorage).removeItem('user');
    (remember ? sessionStorage : localStorage).removeItem('token');
  },

  hydrateFromStorage: () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    set({ token, user });
  },
  
  logout: () => {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
    set({ user: null, token: null });
  }
}));