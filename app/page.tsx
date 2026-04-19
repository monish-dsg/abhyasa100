'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLOR_MAP: Record<string, { bg: string; text: string; label: string }> = {
  'Dark Green': { bg: '#1b4332', text: '#ffffff', label: '🌑 Perfect' },
  'Green': { bg: '#40916c', text: '#ffffff', label: '🟢 Solid' },
  'Orange': { bg: '#e76f51', text: '#ffffff', label: '🟠 Slipped' },
  'Red': { bg: '#e63946', text: '#ffffff', label: '🔴 Missed' },
}

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('*').order('day').then(({ data }) => {
      if (data) setLogs(data)
    })
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
        borderRadius: '20px',
        padding: '40px 36px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8 }}>
          100-DAY DISCIPLINE CHALLENGE
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>
          Abhyasa100
        </h1>
        <p style={{ fontSize: '0.9375rem', opacity: 0.7, marginTop: 6, fontWeight: 400 }}>
          Monish Shah · Day {logs.length} of 100
        </p>
        <p style={{ fontSize: '0.8125rem', opacity: 0.5, marginTop: 4, fontStyle: 'italic' }}>
          Practice and Desirelessness
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Start', value: startWeight ? `${startWeight}` : '—', unit: 'kg' },
          { label: 'Current', value: latest?.weight ? `${latest.weight}` : '—', unit: 'kg' },
          { label: 'Target', value: `${targetWeight}`, unit: 'kg' },
          { label: 'Avg Score', value: avgScore, unit: '/10' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f', lineHeight: 1 }}>
              {s.value}<span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#86868b', marginLeft: 2 }}>{s.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Weight Progress */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Weight Progress</p>
          <p style={{ fontSize: '0.8125rem', color: '#86868b' }}>
            {(startWeight && latest) ? `${(startWeight - latest.weight).toFixed(1)} kg lost` : 'Awaiting Day 1'}
          </p>
        </div>
        <div style={{ background: '#f0f0f0', borderRadius: 100, height: 8, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 100,
            background: 'linear-gradient(90deg, #2d6a4f, #40916c)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <p style={{ fontSize: '0.75rem', color: '#86868b' }}>{startWeight || '—'} kg</p>
          <p style={{ fontSize: '0.75rem', color: '#86868b' }}>{targetWeight} kg</p>
        </div>
      </div>

      {/* Color Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { count: darkGreen, bg: '#1b4332', label: 'Perfect', sub: 'All 10 done' },
          { count: green, bg: '#40916c', label: 'Solid', sub: '5/5 non-neg' },
          { count: orange, bg: '#e76f51', label: 'Slipped', sub: '1 missed' },
          { count: red, bg: '#e63946', label: 'Missed', sub: '2+ missed' },
        ].map(c => (
          <div key={c.label} style={{
            background: c.bg,
            borderRadius: 'var(--radius)',
            padding: '20px 16px',
            textAlign: 'center',
            color: 'white',
          }}>
            <p style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{c.count}</p>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 4 }}>{c.label}</p>
            <p style={{ fontSize: '0.6875rem', opacity: 0.6, marginTop: 2 }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* 100-Day Calendar */}
      <div className="card" style={{ padding: '24px' }}>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f', marginBottom: 16 }}>100-Day Calendar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '6px' }}>
          {Array.from({ length: 100 }, (_, i) => {
            const log = logs.find(l => l.day === i + 1)
            const colorInfo = log ? COLOR_MAP[log.color] : null
            return (
              <div key={i} style={{
                background: colorInfo ? colorInfo.bg : '#f0f0f0',
                color: colorInfo ? colorInfo.text : '#c7c7cc',
                borderRadius: 8,
                padding: '8px 0',
                textAlign: 'center',
                fontSize: '0.6875rem',
                fontWeight: 600,
                transition: 'transform 0.2s ease',
                cursor: log ? 'pointer' : 'default',
              }}
              title={log ? `Day ${i+1}: ${log.color} (${log.score}/10)` : `Day ${i+1}`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Daily Log</p>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#86868b', fontSize: '0.875rem' }}>
            No entries yet. Start your journey tomorrow.
          </div>
        ) : (
          [...logs].reverse().map((l, i) => (
            <div key={l.id} style={{
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: i < logs.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Day {l.day}</span>
                <span style={{ fontSize: '0.75rem', color: '#86868b', marginLeft: 10 }}>{l.date}</span>
                {l.weight > 0 && <span style={{ fontSize: '0.75rem', color: '#86868b', marginLeft: 10 }}>{l.weight} kg</span>}
              </div>
              <div style={{
                background: COLOR_MAP[l.color]?.bg || '#f0f0f0',
                color: 'white',
                padding: '4px 14px',
                borderRadius: 100,
                fontSize: '0.75rem',
                fontWeight: 600,
              }}>
                {l.score}/10
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
