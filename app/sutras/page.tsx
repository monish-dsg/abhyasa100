'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sutras() {
  const [sutras, setSutras] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  useEffect(()=>{supabase.from('yoga_sutras').select('*').order('volume').then(({data})=>{if(data)setSutras(data)})}, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em' }}>Yoga Sutras</h1>
      <p style={{ fontSize:15, color:'#8E8E93', marginTop:-8 }}>Patanjali · Osho · 10 Volumes</p>

      {sutras.length===0 ? (
        <div className="card" style={{ padding:'48px 24px', textAlign:'center' }}>
          <p style={{ fontSize:40, marginBottom:8 }}>📖</p>
          <p style={{ fontSize:15, color:'#8E8E93' }}>No volumes yet</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {sutras.map(s => (
            <div key={s.id} onClick={()=>setSel(sel?.id===s.id?null:s)} className="card"
              style={{ padding:16, cursor:'pointer', borderLeft: sel?.id===s.id ? '3px solid #FF2D55' : '3px solid transparent' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:11, fontWeight:600, color:'#FF2D55', letterSpacing:'0.04em', marginBottom:4 }}>VOLUME {s.volume}</p>
                  <p style={{ fontSize:17, fontWeight:600 }}>{s.title}</p>
                </div>
                <span style={{ fontSize:13, color:'#FF2D55', fontWeight:500 }}>{sel?.id===s.id ? 'Close' : 'Read'}</span>
              </div>
              {sel?.id===s.id && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'0.5px solid rgba(60,60,67,0.12)' }}>
                  <p style={{ fontSize:15, lineHeight:1.7, color:'#3C3C43' }}>{s.summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
