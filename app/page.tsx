'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLOR_MAP: Record<string, string> = {
  'Dark Green': '#00D1A0',
  'Green': '#00D1A0',
  'Orange': '#FFCB00',
  'Red': '#FF3B3B',
}

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('*').order('day').then(({ data }) => { if (data) setLogs(data) })
  }, [])

  const latest = logs[logs.length - 1]
  const day1 = logs.find(l => l.day === 1)
  const startWeight = day1?.weight ?? latest?.weight ?? 0
  const targetWeight = 66
  const darkGreen = logs.filter(l => l.color === 'Dark Green').length
  const green = logs.filter(l => l.color === 'Green').length
  const orange = logs.filter(l => l.color === 'Orange').length
  const red = logs.filter(l => l.color === 'Red').length
  const progress = (startWeight && latest) ? Math.min(100, Math.max(0, ((startWeight - latest.weight) / (startWeight - targetWeight)) * 100)) : 0
  const avgScore = logs.length ? (logs.reduce((a, l) => a + l.score, 0) / logs.length).toFixed(1) : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #141414 0%, #1A1A1A 100%)',
        border: '1px solid rgba(0,209,160,0.15)',
        borderRadius: 16, padding: '36px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(0,209,160,0.05)' }} />
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00D1A0', marginBottom: 8 }}>100-DAY DISCIPLINE</p>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.04em', margin: 0, color: '#fff' }}>Abhyasa100</h1>
        <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Monish Shah · Day {logs.length} of 100</p>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', marginTop: 4, fontStyle: 'italic' }}>Practice and Desirelessness</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'START', value: startWeight ? `${startWeight}` : '—', unit: 'kg' },
          { label: 'CURRENT', value: latest?.weight ? `${latest.weight}` : '—', unit: 'kg' },
          { label: 'TARGET', value: `${targetWeight}`, unit: 'kg' },
          { label: 'AVG SCORE', value: avgScore, unit: '/10' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              {s.value}<span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.3)', marginLeft: 3 }}>{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Weight Progress */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Weight Progress</p>
          <p style={{ fontSize: '0.75rem', color: '#00D1A0' }}>
            {(startWeight && latest) ? `${(startWeight - latest.weight).toFixed(1)} kg lost` : 'Awaiting Day 1'}
          </p>
        </div>
        <div style={{ background: '#222', borderRadius: 100, height: 6, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #00D1A0, #00E8B2)', transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{startWeight || '—'} kg</p>
          <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{targetWeight} kg</p>
        </div>
      </div>

      {/* Color Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { count: darkGreen, color: '#00D1A0', label: 'Perfect', sub: 'All 10' },
          { count: green, color: '#00D1A0', label: 'Solid', sub: '5/5 non-neg' },
          { count: orange, color: '#FFCB00', label: 'Slipped', sub: '1 missed' },
          { count: red, color: '#FF3B3B', label: 'Missed', sub: '2+ missed' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '20px 16px', textAlign: 'center', borderColor: `${c.color}22` }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.count}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{c.label}</p>
            <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card" style={{ padding: 24 }}>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 16 }}>100-Day Calendar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 5 }}>
          {Array.from({ length: 100 }, (_, i) => {
            const log = logs.find(l => l.day === i + 1)
            const bg = log ? COLOR_MAP[log.color] || '#222' : '#1A1A1A'
            const textColor = log ? '#0B0B0B' : 'rgba(255,255,255,0.15)'
            return (
              <div key={i} className="cal-cell" style={{
                background: bg, color: textColor, borderRadius: 6, padding: '7px 0',
                textAlign: 'center', fontSize: '0.625rem', fontWeight: 700,
              }} title={log ? `Day ${i+1}: ${log.color} (${log.score}/10)` : `Day ${i+1}`}>
                {i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Daily Log</p>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem' }}>
            No entries yet. Day 1 starts tomorrow.
          </div>
        ) : (
          [...logs].reverse().map((l, i) => (
            <div key={l.id} className="log-row" style={{
              padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
            }}>
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Day {l.day}</span>
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginLeft: 10 }}>{l.date}</span>
                {l.weight > 0 && <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginLeft: 10 }}>{l.weight} kg</span>}
              </div>
              <div style={{
                background: COLOR_MAP[l.color] || '#222', color: '#0B0B0B',
                padding: '3px 12px', borderRadius: 100, fontSize: '0.6875rem', fontWeight: 700,
              }}>{l.score}/10</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
