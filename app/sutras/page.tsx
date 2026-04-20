'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sutras() {
  const [sutras, setSutras] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  useEffect(() => { supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => { if (data) setSutras(data) }) }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>WISDOM</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Yoga Sutras</h1>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>Patanjali · Osho · 10 Volumes</p>
      </div>

      {sutras.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>📖</p>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>No volumes yet</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {sutras.map(s => (
            <div key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)} className="card"
              style={{ padding: 24, cursor: 'pointer', borderColor: selected?.id === s.id ? 'rgba(0,209,160,0.4)' : undefined }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00D1A0', marginBottom: 6 }}>Volume {s.volume}</p>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.3 }}>{s.title}</h2>
              {selected?.id === s.id && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>SUMMARY</p>
                  <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>{s.summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
