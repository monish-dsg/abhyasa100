'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TL: Record<string,string> = {scale:'⚖️ Scale',food:'🍽️ Meal',selfie:'🤳 Selfie'}

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([])
  useEffect(()=>{supabase.from('photos').select('*').order('day').then(({data})=>{if(data)setPhotos(data)})}, [])

  const byDay = photos.reduce((a,p) => {if(!a[p.day])a[p.day]=[]; a[p.day].push(p); return a}, {} as Record<number,any[]>)
  const days = Object.keys(byDay).sort((a,b) => Number(b)-Number(a))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em' }}>Photos</h1>
      <p style={{ fontSize:15, color:'#8E8E93', marginTop:-8 }}>{photos.length} photos · {days.length} days</p>

      {days.length===0 ? (
        <div className="card" style={{ padding:'48px 24px', textAlign:'center' }}>
          <p style={{ fontSize:40, marginBottom:8 }}>📷</p>
          <p style={{ fontSize:15, color:'#8E8E93' }}>No photos yet</p>
          <p style={{ fontSize:13, color:'#C7C7CC', marginTop:4 }}>Upload through Add page</p>
        </div>
      ) : days.map(day => (
        <div key={day} className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'10px 16px', borderBottom:'0.5px solid rgba(60,60,67,0.12)', display:'flex', justifyContent:'space-between' }}>
            <p style={{ fontSize:15, fontWeight:600 }}>Day {day}</p>
            <p style={{ fontSize:12, color:'#8E8E93' }}>{byDay[Number(day)].length} photos</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:1 }}>
            {byDay[Number(day)].map((p:any) => (
              <div key={p.id} style={{ position:'relative', aspectRatio:'1', overflow:'hidden' }}>
                <img src={p.photo_url} alt={p.caption||`Day ${day}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 8px 6px', background:'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'#fff' }}>{TL[p.type]||p.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
