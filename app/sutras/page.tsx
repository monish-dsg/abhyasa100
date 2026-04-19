'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sutras() {
  const [sutras, setSutras] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => {
      if (data) setSutras(data)
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>WISDOM</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Yoga Sutras</h1>
        <p style={{ fontSize: '0.875rem', color: '#86868b', marginTop: 4 }}>Patanjali · Osho · 10 Volumes</p>
      </div>

      {sutras.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>📖</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#6e6e73' }}>No volumes uploaded yet</p>
          <p style={{ fontSize: '0.8125rem', color: '#86868b', marginTop: 4 }}>Share the PDF text with Yogi to add summaries</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {sutras.map(s => (
            <div key={s.id}
              onClick={() => setSelected(selected?.id === s.id ? null : s)}
              className="card card-interactive"
              style={{
                padding: '24px',
                cursor: 'pointer',
                border: selected?.id === s.id ? '1px solid #2d6a4f' : '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#2d6a4f',
                    marginBottom: 6,
                  }}>
                    Volume {s.volume}
                  </p>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{s.title}</h2>
                </div>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2d6a4f',
                  background: 'rgba(45,106,79,0.08)',
                  padding: '4px 10px',
                  borderRadius: 100,
                }}>
                  {selected?.id === s.id ? 'Close' : 'Read'}
                </span>
              </div>
              {selected?.id === s.id && (
                <div style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <p style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#86868b',
                    marginBottom: 8,
                  }}>
                    YOGI SUMMARY
                  </p>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#6e6e73' }}>{s.summary}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
