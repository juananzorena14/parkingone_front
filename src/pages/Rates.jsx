import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import RatePlanEditor from '@/components/rateplans/RatePlanEditor'

export default function Rates(){
  const [items, setItems] = useState([])
  useEffect(()=>{ api('/rateplans').then(setItems) },[])
  return (
    <div className="space-y-4">
      <RatePlanEditor/>
    </div>
      )
      }