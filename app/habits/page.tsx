'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('habits').select('*').order('day').then(({ data }) => { if (data) setHabits(data) })
    supabase.from('daily_logs').select('*').order('day').then(({ data }) => { if (data) setLogs(data) })
  }, [])

  const pct = (fn: (h: any) => boolean) => habits.length ? Math.round((habits.filter(fn).length / habits.length) * 100) : 0
  const avg = (fn: (h: any) => number) => habits.length ? (habits.reduce((a, h) => a + (fn(h) || 0), 0) / habits.length).toFixed(1) : '0'

  const stats = [
    { label: 'OMAD', emoji: '🍽️', value: pct(h => h.omad), sub: `${habits.filter(h => h.omad).length}/${habits.length} days`, nonNeg: true },
    { label: '10k Steps', emoji: '🚶', value: pct(h => h.steps >= 10000), sub: `Avg ${avg(h => h.steps)} steps`, nonNeg: true },
    { label: 'Meditation', emoji: '🧘', value: pct(h => h.meditate), sub: `${habits.filter(h => h.meditate).length}/${habits.length} days`, nonNeg: true },
    { label: '6hr Sleep', emoji: '😴', value: pct(h => h.sleep_hours >= 6), sub: `Avg ${avg(h => h.sleep_hours)} hrs`, nonNeg: true },
    { label: 'Zero Content', emoji: '📵', value: pct(h => h.zero_content), sub: `${habits.filter(h => h.zero_content).length}/${habits.length} days`, nonNeg: true },
    { label: 'Manifest', emoji: '✨', value: pct(h => h.manifest), sub: `${habits.filter(h => h.manifest).length}/${habits.length} days`, nonNeg: false },
    { label: '3L Water', emoji: '💧', value: pct(h => h.water_liters >= 3), sub: `Avg ${avg(h => h.water_liters)}L`, nonNeg: false },
    { label: 'Yoga Sutras', emoji: '📖', value: pct(h => h.yoga_sutras), sub: `${habits.filter(h => h.yoga_sutras).length}/${habits.length} days`, nonNeg: false },
    { label: 'Zero Inbox', emoji: '📬', value: pct(h => h.zero_inbox), sub: `${habits.filter(h => h.zero_inbox).length}/${habits.length} days`, nonNeg: false },
    { label: 'Workout', emoji: '💪', value: pct(h => h.workout), sub: `${habits.filter(h => h.workout).length}/${habits.length} days`, nonNeg: false },
  ]

  const workouts = habits.filter(h => h.workout && h.workout_type)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>PERFORMANCE</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Habit Tracker</h1>
        <p style={{ fontSize: '0.875rem', color: '#86868b', marginTop: 4 }}>Your 10 disciplines across {habits.length} days</p>
      </div>

      {/* Non-Negotiables */}
      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>NON-NEGOTIABLES</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {stats.filter(s => s.nonNeg).map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.emoji}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: s.value >= 80 ? '#2d6a4f' : s.value >= 50 ? '#e76f51' : '#e63946' }}>
                {s.value}%
              </p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: '0.6875rem', color: '#86868b', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Best Effort */}
      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>BEST EFFORT</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {stats.filter(s => !s.nonNeg).map(s => (
            <div key={s.label} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>{s.emoji}</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: s.value >= 80 ? '#2d6a4f' : s.value >= 50 ? '#e76f51' : '#86868b' }}>
                {s.value}%
              </p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d1d1f', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: '0.6875rem', color: '#86868b', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Workout Log */}
      {workouts.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Workout Log</p>
          </div>
          {workouts.map((h, i) => (
            <div key={h.day} style={{
              padding: '14px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: i < workouts.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
            }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#2d6a4f' }}>Day {h.day}</span>
              <span style={{ fontSize: '0.8125rem', color: '#6e6e73', background: 'rgba(45,106,79,0.08)', padding: '4px 12px', borderRadius: 100 }}>{h.workout_type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily Breakdown Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Daily Breakdown</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8125rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Day', 'OMAD', 'Steps', 'Med', 'Sleep', 'Content', 'Manifest', 'Water', 'Sutras', 'Inbox', 'Workout'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#86868b',
                    fontSize: '0.6875rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(0,0,0,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((h, i) => (
                <tr key={h.day} style={{ borderBottom: i < habits.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1d1d1f' }}>{h.day}</td>
                  <td style={{ padding: '10px 12px' }}>{h.omad ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px', color: h.steps >= 10000 ? '#2d6a4f' : '#e63946', fontWeight: 500 }}>{h.steps?.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>{h.meditate ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px', color: h.sleep_hours >= 6 ? '#2d6a4f' : '#e63946', fontWeight: 500 }}>{h.sleep_hours}h</td>
                  <td style={{ padding: '10px 12px' }}>{h.zero_content ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px' }}>{h.manifest ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{h.water_liters}L</td>
                  <td style={{ padding: '10px 12px' }}>{h.yoga_sutras ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px' }}>{h.zero_inbox ? '✅' : '❌'}</td>
                  <td style={{ padding: '10px 12px' }}>{h.workout ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
