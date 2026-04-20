'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])
  useEffect(() => { supabase.from('habits').select('*').order('day').then(({data}) => {if(data)setHabits(data)}) }, [])

  const pct = (fn:(h:any)=>boolean) => habits.length ? Math.round((habits.filter(fn).length/habits.length)*100) : 0
  const avg = (fn:(h:any)=>number) => habits.length ? (habits.reduce((a,h)=>a+(fn(h)||0),0)/habits.length).toFixed(1) : '0'
  const col = (v:number) => v>=80?'#34C759':v>=50?'#FF9500':'#FF3B30'

  const stats = [
    {l:'OMAD',e:'🍽️',v:pct(h=>h.omad),s:`${habits.filter(h=>h.omad).length}/${habits.length}`,nn:true},
    {l:'Steps',e:'🚶',v:pct(h=>h.steps>=10000),s:`Avg ${avg(h=>h.steps)}`,nn:true},
    {l:'Meditate',e:'🧘',v:pct(h=>h.meditate),s:`${habits.filter(h=>h.meditate).length}/${habits.length}`,nn:true},
    {l:'Sleep',e:'😴',v:pct(h=>h.sleep_hours>=6),s:`Avg ${avg(h=>h.sleep_hours)}h`,nn:true},
    {l:'No Content',e:'📵',v:pct(h=>h.zero_content),s:`${habits.filter(h=>h.zero_content).length}/${habits.length}`,nn:true},
    {l:'Manifest',e:'✨',v:pct(h=>h.manifest),s:`${habits.filter(h=>h.manifest).length}/${habits.length}`,nn:false},
    {l:'Water',e:'💧',v:pct(h=>h.water_liters>=3),s:`Avg ${avg(h=>h.water_liters)}L`,nn:false},
    {l:'Sutras',e:'📖',v:pct(h=>h.yoga_sutras),s:`${habits.filter(h=>h.yoga_sutras).length}/${habits.length}`,nn:false},
    {l:'Inbox',e:'📬',v:pct(h=>h.zero_inbox),s:`${habits.filter(h=>h.zero_inbox).length}/${habits.length}`,nn:false},
    {l:'Workout',e:'💪',v:pct(h=>h.workout),s:`${habits.filter(h=>h.workout).length}/${habits.length}`,nn:false},
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em' }}>Habits</h1>
      <p style={{ fontSize:15, color:'#8E8E93', marginTop:-8 }}>{habits.length} days tracked</p>

      <p className="gh">Non-negotiables</p>
      <div className="stat-grid stat-grid-5">
        {stats.filter(s=>s.nn).map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize:18, marginBottom:2 }}>{s.e}</p>
            <p style={{ fontSize:20, fontWeight:700, color:col(s.v) }}>{s.v}%</p>
            <p style={{ fontSize:11, fontWeight:600, marginTop:2 }}>{s.l}</p>
            <p style={{ fontSize:10, color:'#8E8E93' }}>{s.s}</p>
          </div>
        ))}
      </div>

      <p className="gh">Best effort</p>
      <div className="stat-grid stat-grid-5">
        {stats.filter(s=>!s.nn).map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize:18, marginBottom:2 }}>{s.e}</p>
            <p style={{ fontSize:20, fontWeight:700, color:col(s.v) }}>{s.v}%</p>
            <p style={{ fontSize:11, fontWeight:600, marginTop:2 }}>{s.l}</p>
            <p style={{ fontSize:10, color:'#8E8E93' }}>{s.s}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow:'hidden' }}>
        <p style={{ fontSize:15, fontWeight:600, padding:'12px 16px', borderBottom:'0.5px solid rgba(60,60,67,0.12)' }}>Daily breakdown</p>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
            <thead><tr style={{background:'#FAFAFA'}}>
              {['Day','OMAD','Steps','Med','Sleep','Content','Manifest','Water','Sutras','Inbox','Gym'].map(h=>(
                <th key={h} style={{padding:'8px 6px',textAlign:'left',fontWeight:600,color:'#8E8E93',fontSize:9,letterSpacing:'0.04em',borderBottom:'0.5px solid rgba(60,60,67,0.12)'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{habits.map((h,i)=>(
              <tr key={h.day} style={{borderBottom:i<habits.length-1?'0.5px solid rgba(60,60,67,0.06)':'none'}}>
                <td style={{padding:'7px 6px',fontWeight:600}}>{h.day}</td>
                <td style={{padding:'7px 6px'}}>{h.omad?'✅':'❌'}</td>
                <td style={{padding:'7px 6px',color:h.steps>=10000?'#34C759':'#FF3B30',fontWeight:500,fontSize:12}}>{h.steps?.toLocaleString()}</td>
                <td style={{padding:'7px 6px'}}>{h.meditate?'✅':'❌'}</td>
                <td style={{padding:'7px 6px',color:h.sleep_hours>=6?'#34C759':'#FF3B30',fontWeight:500,fontSize:12}}>{h.sleep_hours}h</td>
                <td style={{padding:'7px 6px'}}>{h.zero_content?'✅':'❌'}</td>
                <td style={{padding:'7px 6px'}}>{h.manifest?'✅':'❌'}</td>
                <td style={{padding:'7px 6px',fontSize:12}}>{h.water_liters}L</td>
                <td style={{padding:'7px 6px'}}>{h.yoga_sutras?'✅':'❌'}</td>
                <td style={{padding:'7px 6px'}}>{h.zero_inbox?'✅':'❌'}</td>
                <td style={{padding:'7px 6px'}}>{h.workout?'✅':'❌'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
