export default function Pagination({ page, size, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total ? (page-1)*size + 1 : 0;
  const to   = Math.min(total, page*size);

  function go(p){ if(p>=1 && p<=pages) onPage(p); }

  // generar un pequeño rango de páginas (actual ±2)
  const nums = [];
  const start = Math.max(1, page-2);
  const end   = Math.min(pages, page+2);
  for (let i=start; i<=end; i++) nums.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 my-3 mx-3">
      <div className="text-xs text-gray-500 ">
        Mostrando {from}-{to} de {total}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={()=>go(page-1)} disabled={page<=1}
          className="px-2 py-1 rounded-lg border bg-white disabled:opacity-50">‹</button>
        {start>1 && (
          <>
            <button onClick={()=>go(1)} className="px-2 py-1 rounded-lg border bg-white">1</button>
            {start>2 && <span className="px-1 text-gray-400">…</span>}
          </>
        )}
        {nums.map(n=>(
          <button key={n} onClick={()=>go(n)}
            className={`px-2 py-1 rounded-lg border ${n===page?'bg-gray-900 text-white':'bg-white'}`}>
            {n}
          </button>
        ))}
        {end<pages && (
          <>
            {end<pages-1 && <span className="px-1 text-gray-400">…</span>}
            <button onClick={()=>go(pages)} className="px-2 py-1 rounded-lg border bg-white">{pages}</button>
          </>
        )}
        <button onClick={()=>go(page+1)} disabled={page>=pages}
          className="px-2 py-1 rounded-lg border bg-white disabled:opacity-50">›</button>
      </div>
    </div>
  );
}
