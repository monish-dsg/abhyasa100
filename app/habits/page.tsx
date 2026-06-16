'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MUST = [
  { key: 'omad', label: 'OMAD', icon: '🍽️', check: (h: any) => h?.omad },
  { key: 'workout', label: 'Workout (10k)', icon: '🏃', check: (h: any) => h?.workout_10k || h?.physical_activity || h?.workout },
  { key: 'clean', label: 'Clean Eating', icon: '🥗', check: (h: any) => h?.clean_eating || h?.ate_clean || h?.fast_post_4pm },
]

const BONUS = [
  { key: 'meditate', label: 'Meditate', icon: '🧘', check: (h: any) => h?.meditate },
  { key: 'manifest', label: 'Manifest', icon: '✨', check: (h: any) => h?.manifest },
  { key: 'sleep', label: 'Sleep Well (6 Hrs)', icon: '😴', check: (h: any) => h?.sleep_well || h?.sleep_6hrs || (h?.sleep_hours >= 6) },
  { key: 'sutras', label: 'YogaSutras', icon: '📖', check: (h: any) => h?.yoga_sutras },
  { key: 'inbox', label: 'Zero Inbox', icon: '📬', check: (h: any) => h?.zero_inbox },
  { key: 'content', label: 'No Content', icon: '📵', check: (h: any) => h?.no_content || h?.zero_content },
  { key: 'water', label: 'Hydrated (3Ls)', icon: '💧', check: (h: any) => h?.hydrated || h?.water_3l || (h?.water_liters >= 3) },
]

const SCHEDULE = [
  { time: '4:15am – 5:00am', activity: 'Manifest, YogaSutras & 1L water' },
  { time: '5:00am – 6:30am', activity: 'Walk & Meditate' },
  { time: '6:30am – 7:30am', activity: 'Kids Time' },
  { time: '7:30am – 9:30am', activity: 'Gym or Padel' },
  { time: '9:30am – 2:00pm', activity: 'DreamSetGo Time' },
  { time: '2:00pm – 2:30pm', activity: 'Lunch (Clean Eating)' },
  { time: '2:30pm – 8:00pm', activity: 'DreamSetGo Time' },
  { time: '8:00pm – 10:00pm', activity: 'Kids Time' },
  { time: '10:00pm', activity: 'Sleep' },
]

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => {
      const aid = data?.[0]?.attempt_number || 1
      supabase.from('habits').select('*').eq('attempt_id', aid).order('day').then(({ data: h }) => { if (h) setHabits(h) })
      supabase.from('daily_logs').select('*').eq('attempt_id', aid).order('day').then(({ data: l }) => { if (l) setLogs(l) })
    })
  }, [])

  const pct = (fn: (h: any) => boolean) => habits.length ? Math.round((habits.filter(fn).length / habits.length) * 100) : 0
  const col = (v: number) => v >= 80 ? '#34C759' : v >= 40 ? '#FF9500' : '#FF3B30'

  const avgScore = logs.length ? Math.round((logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length) * 10) / 10 : 0
  const avgPct = avgScore * 10

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Habits</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>{habits.length} days tracked · Avg {avgScore}/10</p>

      {/* Overall Score */}
      <div className="card" style={{ padding: '20px 16px', background: avgPct > 80 ? 'linear-gradient(135deg, #248A3D, #34C759)' : avgPct >= 40 ? 'linear-gradient(135deg, #FF9500, #FFB340)' : 'linear-gradient(135deg, #FF3B30, #FF6961)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>OVERALL AVERAGE</p>
            <p style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginTop: 4 }}>{avgScore}<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>/10</span></p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Score out of 10</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Must Have&apos;s = 70%</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Bonus = 30%</p>
          </div>
        </div>
      </div>

      {/* Perfect Day */}
      <div className="card perfect-day">
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#FF2D55' }}>✨ The Perfect Day</p>
        {SCHEDULE.map((s, i) => (
          <div key={i} className="perfect-slot">
            <span className="perfect-time">{s.time}</span>
            <span className="perfect-activity">{s.activity}</span>
          </div>
        ))}
      </div>

      {/* Must Have's */}
      <p className="gh">Must Have&apos;s · 70% of score</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {MUST.map(s => {
          const v = pct(h => s.check(h))
          return (
            <div key={s.key} className="stat">
              <p style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: col(v) }}>{v}%</p>
              <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.label}</p>
              <p style={{ fontSize: 10, color: '#AEAEB2' }}>{habits.filter(h => s.check(h)).length}/{habits.length}</p>
            </div>
          )
        })}
      </div>

      {/* Bonus */}
      <p className="gh">Bonus · 30% of score</p>
      <div className="stat-grid">
        {BONUS.map(s => {
          const v = pct(h => s.check(h))
          return (
            <div key={s.key} className="stat">
              <p style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: col(v) }}>{v}%</p>
              <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.label}</p>
              <p style={{ fontSize: 10, color: '#AEAEB2' }}>{habits.filter(h => s.check(h)).length}/{habits.length}</p>
            </div>
          )
        })}
      </div>

      {/* Scoring Explanation */}
      <div className="card" style={{ padding: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>How Scoring Works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>G</div>
            <div><p style={{ fontSize: 14, fontWeight: 600 }}>Green · Above 80%</p><p style={{ fontSize: 12, color: '#8E8E93' }}>Score above 8/10</p></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FF9500', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>A</div>
            <div><p style={{ fontSize: 14, fontWeight: 600 }}>Amber · 40% to 80%</p><p style={{ fontSize: 12, color: '#8E8E93' }}>Score 4 to 8 out of 10</p></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FF3B30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>R</div>
            <div><p style={{ fontSize: 14, fontWeight: 600 }}>Red · Below 40%</p><p style={{ fontSize: 12, color: '#8E8E93' }}>Score below 4/10</p></div>
          </div>
        </div>
      </div>
    </div>
  )
}
