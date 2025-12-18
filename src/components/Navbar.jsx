import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getUser, hasRole, SCREEN_ROLES } from '@/lib/auth';
import { LogOut } from 'lucide-react';

const link = 'px-3 py-2 rounded-lg hover:bg-gray-100';
const active = 'bg-gray-900 text-white hover:bg-gray-900';

export default function Navbar(){
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(()=>{ setUser(getUser()); },[]);

  function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace:true });
  }

  return (
    <header className="bg-white/80 backdrop-blur shadow-md sticky">
      <div className="max-w-6xl mx-auto p-3 flex items-center gap-2">
        <div className="font-semibold">ParkingPro</div>
        <nav className="ml-4 flex gap-2">
          {hasRole(SCREEN_ROLES.DASHBOARD) && (
            <NavLink to="/" end className={({isActive})=>`${link} ${isActive?active:''}`}>Dashboard</NavLink>
          )}
          {hasRole(SCREEN_ROLES.TICKETS) && (
            <NavLink to="/tickets" className={({isActive})=>`${link} ${isActive?active:''}`}>Tickets</NavLink>
          )}
          {hasRole(SCREEN_ROLES.RATES) && (
            <NavLink to="/rates" className={({isActive})=>`${link} ${isActive?active:''}`}>Tarifas</NavLink>
          )}
          {hasRole(SCREEN_ROLES.REPORTS) && (
            <NavLink to="/reports" className={({isActive}) => `${link} ${isActive?active:""}`}>Reportes</NavLink>
          )}
          {hasRole(SCREEN_ROLES.REPORTS) && (
            <NavLink to="/subscribers" className={({isActive}) => `${link} ${isActive?active:""}`}>Abonados</NavLink>
          )}
          {hasRole(SCREEN_ROLES.REPORTS) && (
            <NavLink to="/movements" className={({isActive}) => `${link} ${isActive?active:""}`}>Movimientos</NavLink>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && <span className="text-sm text-gray-600">{user.name}</span>}
          {user && 
            <div className='flex flex-row items-center space-x-1 '>
              <button onClick={logout} className="pl-3 py-2 rounded-lg ">Salir</button>
              <LogOut className='w-4 '/>
            </div>
          }
          
        </div>
      </div>
    </header>
  );
}
