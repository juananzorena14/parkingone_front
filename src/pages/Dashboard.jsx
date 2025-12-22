import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import KpiCard from '@/components/KpiCard'
import {CloseShiftButton} from "@/components/CloseShiftButton"

export default function Dashboard(){
  const [occ, setOcc] = useState({ total:0, occupied:0, free:0, rate:0 })
  const [cash, setCash] = useState({ expectedNow: 0, paymentsCashNet: 0 })
  const [_loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  async function refresh(){
    try{
      setLoading(true)
      setOcc(await api('/reports/occupancy'))

      // Caja del usuario actual (turno abierto)
      const s = await api('/api/cash-shifts/current/summary')
      setCash(s?.cash || { expectedNow: 0, paymentsCashNet: 0 })
    }catch(e){ setErr(String(e)) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() },[])

  return (
    <div className="space-y-4">
      <div className='flex items-center justify-between'>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <CloseShiftButton/>
      {err && <div className="text-sm text-red-600">{err}</div>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Plazas totales" value={String(occ.total)} />
        <KpiCard label="Ocupadas" value={String(occ.occupied)} />
        <KpiCard label="Libres" value={String(occ.free)} />
        <KpiCard label="Ocupación" value={`${Math.round(occ.rate*100)}%`} color={occ.rate > 0.9 ? "red" : occ.rate > 0.7 ? "amber" : "green"} />
        <KpiCard label="Caja (efectivo)" value={String(Math.round(cash.expectedNow || 0))} hint={`Cobrado: ${Math.round(cash.paymentsCashNet || 0)}`} />
      </div>
    </div>
  )
}