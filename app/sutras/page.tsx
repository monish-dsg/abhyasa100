'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sutras() {
  const [sutras, setSutras] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  useEffect(() => { supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => { if (data) setSutras(data) }) }, [])

  const formatSummary = (text: string) => {
    if (!text) return null
    return text.split('\n').filter(Boolean).map((line, i) => {
      const trimmed = line.trim()
      // Sutra references (lines starting with numbers like 1.1: or containing Sanskrit)
      if (/^\d+\.\d+:/.test(trimmed)) {
        return <div key={i} className="sutra-ref">{trimmed}</div>
      }
      // Section headers (ALL CAPS lines)
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 100 && !trimmed.includes('.')) {
        return <h2 key={i}>{trimmed.charAt(0) + trimmed.slice(1).toLowerCase()}</h2>
      }
      // Regular paragraphs
      return <p key={i}>{trimmed}</p>
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Yoga Sutras</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>Patanjali · Osho · 10 Volumes</p>

      {sutras.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>📖</p>
          <p style={{ fontSize: 15, color: '#8E8E93' }}>No volumes yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sutras.map(s => (
            <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
              <div onClick={() => setSel(sel?.id === s.id ? null : s)}
                style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#FF2D55', letterSpacing: '0.04em', marginBottom: 4 }}>VOLUME {s.volume}</p>
                  <p style={{ fontSize: 17, fontWeight: 600 }}>{s.title}</p>
                </div>
                <span style={{ fontSize: 20, color: '#C7C7CC', transition: 'transform 0.2s', transform: sel?.id === s.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
              </div>
              {sel?.id === s.id && (
                <div className="sutra-reader" style={{ borderTop: '0.5px solid rgba(60,60,67,0.12)' }}>
                  {formatSummary(s.summary)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
