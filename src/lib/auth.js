export function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}

export function getRole() {
  return getUser()?.role || null; // 'ADMIN' | 'OPERATOR' | 'SUPERVISOR' | null
}

export function hasRole(roles = []) {
  const r = getRole();
  if (!roles?.length) return !!r;
  return roles.includes(r);
}

// Matriz de permisos por pantalla (ajustá a gusto)
export const SCREEN_ROLES = {
  DASHBOARD: ['ADMIN','SUPERVISOR','OPERATOR'],
  TICKETS:   ['ADMIN','SUPERVISOR','OPERATOR'],
  RATES:     ['ADMIN','SUPERVISOR'],   // Operador NO
  REPORTS:   ['ADMIN','SUPERVISOR'],   
};
