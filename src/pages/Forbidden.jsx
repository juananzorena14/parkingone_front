import { Link } from 'react-router-dom';

export default function Forbidden(){
  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="bg-white border rounded-2xl shadow p-8 text-center space-y-3 max-w-md">
        <h1 className="text-2xl font-semibold">403 — Acceso denegado</h1>
        <p className="text-sm text-gray-600">No tenés permisos para ver esta sección.</p>
        <Link to="/" className="inline-block px-3 py-2 rounded-lg border bg-white">Ir al Dashboard</Link>
      </div>
    </div>
  );
}
