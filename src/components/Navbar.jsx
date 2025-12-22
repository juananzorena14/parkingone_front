import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { api } from '@/lib/api';
import { onShiftChanged } from '@/lib/shiftEvents';
import { getUser, hasRole, SCREEN_ROLES } from '@/lib/auth';
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Ticket,
  Tags,
  Users,
  Wallet,
} from 'lucide-react';

const link = 'px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2';
const active = 'bg-gray-900 text-white hover:bg-gray-900';

function LinkItem({ to, end = false, icon: Icon, label, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `${link} ${isActive ? active : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shift, setShift] = useState(null); // null: none / unknown, object: current shift

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const shouldGate = Boolean(token);

  const shiftText = useMemo(() => {
    if (!shift?.openedAt) return null;
    return `Turno abierto · ${dayjs(shift.openedAt).format('HH:mm')}`;
  }, [shift]);

  useEffect(() => {
    setUser(getUser());
  }, []);

  async function refreshShift() {
    if (!shouldGate) {
      setShift(null);
      return;
    }
    try {
      const cur = await api('/api/cash-shifts/current');
      setShift(cur || null);
    } catch {
      setShift(null);
    }
  }

  useEffect(() => {
    refreshShift();
    const off = onShiftChanged(() => refreshShift());
    return () => off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldGate]);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setMenuOpen(false);
    navigate('/login', { replace: true });
  }

  const canDashboard = hasRole(SCREEN_ROLES.DASHBOARD);
  const canTickets = hasRole(SCREEN_ROLES.TICKETS);
  const canShift = canTickets;
  const canRates = hasRole(SCREEN_ROLES.RATES);
  const canReports = hasRole(SCREEN_ROLES.REPORTS);

  return (
    <header className="bg-white/80 backdrop-blur shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto p-3 flex items-center gap-2">
        <div className="font-semibold">ParkingPro</div>

        {/* Desktop/tablet nav: icons always, labels only on lg+ */}
        <nav className="ml-4 hidden md:flex gap-1">
          {canDashboard && <LinkItem to="/" end icon={LayoutDashboard} label="Dashboard" />}
          {canTickets && <LinkItem to="/tickets" icon={Ticket} label="Tickets" />}
          {canShift && <LinkItem to="/shift" icon={Wallet} label="Turno" />}
          {canRates && <LinkItem to="/rates" icon={Tags} label="Tarifas" />}
          {canReports && <LinkItem to="/reports" icon={BarChart3} label="Reportes" />}
          {canReports && <LinkItem to="/subscribers" icon={Users} label="Abonados" />}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Shift status pill (only when there is an open shift) */}
          {shiftText && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs">
              <Wallet className="w-3.5 h-3.5" />
              <span className="font-medium">{shiftText}</span>
            </div>
          )}

          {user && <span className="hidden sm:inline text-sm text-gray-600">{user.name}</span>}

          {/* Mobile menu button */}
          {user && (
            <button
              type="button"
              className="md:hidden p-2 rounded-lg border bg-white"
              onClick={() => setMenuOpen((s) => !s)}
              aria-label="Abrir menú"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Desktop logout */}
          {user && (
            <div className="hidden md:flex flex-row items-center space-x-1">
              <button onClick={logout} className="pl-3 py-2 rounded-lg">Salir</button>
              <LogOut className="w-4" />
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && (
        <div className="md:hidden border-t bg-white pp-fade-in">
          <div className="max-w-6xl mx-auto p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                <div className="font-medium">{user.name}</div>
                {shiftText && (
                  <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs">
                    <Wallet className="w-3.5 h-3.5" />
                    <span className="font-medium">{shiftText}</span>
                  </div>
                )}
              </div>
              <button onClick={logout} className="px-3 py-2 rounded-lg border bg-white text-sm flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {canDashboard && (
                <NavLink
                  to="/"
                  end
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </NavLink>
              )}
              {canTickets && (
                <NavLink
                  to="/tickets"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <Ticket className="w-4 h-4" />
                  Tickets
                </NavLink>
              )}
              {canShift && (
                <NavLink
                  to="/shift"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <Wallet className="w-4 h-4" />
                  Mi turno
                </NavLink>
              )}
              {canRates && (
                <NavLink
                  to="/rates"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <Tags className="w-4 h-4" />
                  Tarifas
                </NavLink>
              )}
              {canReports && (
                <NavLink
                  to="/reports"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Reportes
                </NavLink>
              )}
              {canReports && (
                <NavLink
                  to="/subscribers"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `px-3 py-2 rounded-xl border bg-white flex items-center gap-2 ${isActive ? 'border-gray-900' : ''}`}
                >
                  <Users className="w-4 h-4" />
                  Abonados
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
