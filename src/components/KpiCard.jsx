export default function KpiCard({ label, value, hint, color }){
  return (
    <div className="rounded-2xl shadow-md p-4   bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-3xl font-semibold" style={{color:color || "inherit"}}>{value}</div>
        {hint ? <div className="text-xs mt-1 text-gray-500">{hint}</div> : null}
      </div>
  );
}