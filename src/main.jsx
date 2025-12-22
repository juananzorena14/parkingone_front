import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import Rates from './pages/Rates'
import Login from './pages/Login'
import Protected from './components/Protected';
import { SCREEN_ROLES } from './lib/auth';
import Forbidden from './pages/Forbidden';
import Reports from './pages/Reports'
import Subscribers from './pages/Subscribers'
import ShiftDetails from './pages/ShiftDetails'
import Shift from './pages/Shift'
import { Toaster } from 'react-hot-toast'
import ShiftGate from './components/ShiftGate'

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Protected roles={SCREEN_ROLES.DASHBOARD}><Dashboard/></Protected> },
    { path: 'tickets', element: <Protected roles={SCREEN_ROLES.TICKETS}><Tickets/></Protected> },
    { path: 'shift', element: <Protected roles={SCREEN_ROLES.TICKETS}><Shift/></Protected> },
    { path: 'rates', element: <Protected roles={SCREEN_ROLES.RATES}><Rates/></Protected> },
    { path: 'reports', element: <Protected roles={SCREEN_ROLES.REPORTS}><Reports/></Protected> },
    { path: 'reports/shifts/:id', element: <Protected roles={SCREEN_ROLES.REPORTS}><ShiftDetails/></Protected> },
    { path: 'subscribers', element: <Protected roles={SCREEN_ROLES.REPORTS}><Subscribers/></Protected> },

    // Back-compat: Movements now lives inside /reports (tab=movements)
    { path: 'movements', element: <Protected roles={SCREEN_ROLES.REPORTS}><Navigate to="/reports?tab=movements" replace /></Protected> },
    // Keep old deep-link working
    { path: 'movements/shifts/:id', element: <Protected roles={SCREEN_ROLES.REPORTS}><ShiftDetails/></Protected> },
    { path: 'login', element: <Login/> },
    { path: 'forbidden', element: <Forbidden/> },
  ]}
])


ReactDOM.createRoot(document.getElementById('root')).render(
<React.StrictMode>
  <ShiftGate>
    <RouterProvider router={router} />
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: { fontSize: '14px' },
        success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
      }}
    />
  </ShiftGate>
</React.StrictMode>,
)