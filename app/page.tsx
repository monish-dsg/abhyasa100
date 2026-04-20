'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CM: Record<string,{bg:string,t:string}> = {
  'Dark Green':{bg:'#248A3D',t:'#fff'}, 'Green':{bg:'#34C759',t:'#fff'},
  'Orange':{bg:'#FF9500',t:'#fff'}, 'Red':{bg:'#FF3B30',t:'#fff'},
}

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => { supabase.from('daily_logs').select('*').order('day').then(({data}) => {if(data)setLogs(data)}) }, [])

  const latest = logs[logs.length-1]
  const d1 = logs.find(l => l.day===1)
  const sw = d1?.weight ?? latest?.weight ?? 0
  const tw = 66
  const dg = logs.filter(l => l.color==='Dark Green').length
  const gr = logs.filter(l => l.color==='Green').length
  const or = logs.filter(l => l.color==='Orange').length
  const rd = logs.filter(l => l.color==='Red').length
  const prog = (sw && latest) ? Math.min(100,Math.max(0,((sw-latest.weight)/(sw-tw))*100)) : 0
  const avg = logs.length ? (logs.reduce((a,l)=>a+l.score,0)/logs.length).toFixed(1) : '—'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em' }}>Abhyasa100</h1>
      <p style={{ fontSize:15, color:'#8E8E93', marginTop:-8 }}>Day {logs.length} of 100</p>

      <div className="stat-grid stat-grid-4">
        {[{l:'START',v:sw?`${sw}`:'—',u:'kg'},{l:'CURRENT',v:latest?.weight?`${latest.weight}`:'—',u:'kg'},{l:'TARGET',v:`${tw}`,u:'kg'},{l:'AVG',v:avg,u:'/10'}].map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize:10, fontWeight:600, color:'#8E8E93', letterSpacing:'0.04em', marginBottom:4 }}>{s.l}</p>
            <p style={{ fontSize:22, fontWeight:700 }}>{s.v}<span style={{ fontSize:13, color:'#8E8E93' }}>{s.u}</span></p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:15, fontWeight:600 }}>Weight</span>
          <span style={{ fontSize:13, color:'#FF2D55' }}>{(sw&&latest)?`${(sw-latest.weight).toFixed(1)} kg lost`:'Awaiting Day 1'}</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width:`${prog}%`, background:'linear-gradient(90deg, #FF2D55, #FF6482)' }} /></div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }} className="stat-grid-4">
        {[{c:dg,bg:'#248A3D',l:'Perfect'},{c:gr,bg:'#34C759',l:'Solid'},{c:or,bg:'#FF9500',l:'Slipped'},{c:rd,bg:'#FF3B30',l:'Missed'}].map(x => (
          <div key={x.l} style={{ background:x.bg, borderRadius:10, padding:'14px 6px', textAlign:'center', color:'#fff' }}>
            <p style={{ fontSize:22, fontWeight:700 }}>{x.c}</p>
            <p style={{ fontSize:10, fontWeight:600, opacity:0.8, marginTop:2 }}>{x.l}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:14 }}>
        <p style={{ fontSize:15, fontWeight:600, marginBottom:10 }}>Calendar</p>
        <div className="cal-grid">
          {Array.from({length:100},(_,i) => {
            const log = logs.find(l => l.day===i+1); const c = log ? CM[log.color] : null
            return <div key={i} className="cal-cell" style={{ background:c?c.bg:'#F2F2F7', color:c?c.t:'#C7C7CC' }}>{i+1}</div>
          })}
        </div>
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <p style={{ fontSize:15, fontWeight:600, padding:'12px 16px', borderBottom:'0.5px solid rgba(60,60,67,0.12)' }}>Log</p>
        {logs.length===0 ? <p style={{ padding:24, textAlign:'center', color:'#8E8E93', fontSize:15 }}>No entries yet</p> :
          [...logs].reverse().map((l,i) => (
            <div key={l.id} className="log-row">
              <div><span style={{ fontSize:15, fontWeight:600 }}>Day {l.day}</span><span style={{ fontSize:12, color:'#8E8E93', marginLeft:8 }}>{l.date}</span>{l.weight>0 && <span style={{ fontSize:12, color:'#8E8E93', marginLeft:8 }}>{l.weight}kg</span>}</div>
              <span className="badge" style={{ background:CM[l.color]?.bg||'#E5E5EA' }}>{l.score}/10</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
