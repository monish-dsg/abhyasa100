'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])

  useEffect(() => {
    supabase.from('habits').select('*').order('day').then(({ data }) => { if (data) setHabits(data) })
  }, [])

  const pct = (fn: (h: any) => boolean) => habits.length ? Math.round((habits.filter(fn).length / habits.length) * 100) : 0
  const avg = (fn: (h: any) => number) => habits.length ? (habits.reduce((a, h) => a + (fn(h) || 0), 0) / habits.length).toFixed(1) : '0'

  const stats = [
    { label: 'OMAD', emoji: '🍽️', value: pct(h => h.omad), sub: `${habits.filter(h => h.omad).length}/${habits.length}`, nn: true },
    { label: '10k Steps', emoji: '🚶', value: pct(h => h.steps >= 10000), sub: `Avg ${avg(h => h.steps)}`, nn: true },
    { label: 'Meditation', emoji: '🧘', value: pct(h => h.meditate), sub: `${habits.filter(h => h.meditate).length}/${habits.length}`, nn: true },
    { label: '6hr Sleep', emoji: '😴', value: pct(h => h.sleep_hours >= 6), sub: `Avg ${avg(h => h.sleep_hours)}h`, nn: true },
    { label: 'Zero Content', emoji: '📵', value: pct(h => h.zero_content), sub: `${habits.filter(h => h.zero_content).length}/${habits.length}`, nn: true },
    { label: 'Manifest', emoji: '✨', value: pct(h => h.manifest), sub: `${habits.filter(h => h.manifest).length}/${habits.length}`, nn: false },
    { label: '3L Water', emoji: '💧', value: pct(h => h.water_liters >= 3), sub: `Avg ${avg(h => h.water_liters)}L`, nn: false },
    { label: 'Yoga Sutras', emoji: '📖', value: pct(h => h.yoga_sutras), sub: `${habits.filter(h => h.yoga_sutras).length}/${habits.length}`, nn: false },
    { label: 'Zero Inbox', emoji: '📬', value: pct(h => h.zero_inbox), sub: `${habits.filter(h => h.zero_inbox).length}/${habits.length}`, nn: false },
    { label: 'Workout', emoji: '💪', value: pct(h => h.workout), sub: `${habits.filter(h => h.workout).length}/${habits.length}`, nn: false },
  ]

  const getColor = (v: number) => v >= 80 ? '#00D1A0' : v >= 50 ? '#FFCB00' : '#FF3B3B'
  const workouts = habits.filter(h => h.workout && h.workout_type)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>PERFORMANCE</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Habits</h1>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{habits.length} days tracked</p>
      </div>

      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>NON-NEGOTIABLES</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {stats.filter(s => s.nn).map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: 6 }}>{s.emoji}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: getColor(s.value) }}>{s.value}%</p>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>BEST EFFORT</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {stats.filter(s => !s.nn).map(s => (
            <div key={s.label} className="card" style={{ padding: '18px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.25rem', marginBottom: 6 }}>{s.emoji}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: getColor(s.value) }}>{s.value}%</p>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {workouts.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Workout Log</p>
          </div>
          {workouts.map((h, i) => (
            <div key={h.day} style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < workouts.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#00D1A0' }}>Day {h.day}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,209,160,0.08)', padding: '3px 10px', borderRadius: 100 }}>{h.workout_type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Daily Breakdown</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#141414' }}>
              {['Day','OMAD','Steps','Med','Sleep','Content','Manifest','Water','Sutras','Inbox','Workout'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'rgba(255,255,255,0.25)', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {habits.map((h, i) => (
                <tr key={h.day} style={{ borderBottom: i < habits.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600 }}>{h.day}</td>
                  <td style={{ padding: '8px 10px' }}>{h.omad ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px', color: h.steps >= 10000 ? '#00D1A0' : '#FF3B3B', fontWeight: 500 }}>{h.steps?.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px' }}>{h.meditate ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px', color: h.sleep_hours >= 6 ? '#00D1A0' : '#FF3B3B', fontWeight: 500 }}>{h.sleep_hours}h</td>
                  <td style={{ padding: '8px 10px' }}>{h.zero_content ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px' }}>{h.manifest ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{h.water_liters}L</td>
                  <td style={{ padding: '8px 10px' }}>{h.yoga_sutras ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px' }}>{h.zero_inbox ? '✅' : '❌'}</td>
                  <td style={{ padding: '8px 10px' }}>{h.workout ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
