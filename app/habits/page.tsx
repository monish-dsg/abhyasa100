'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])
  const [attemptId, setAttemptId] = useState(1)

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => {
      const aid = data?.[0]?.attempt_number || 1; setAttemptId(aid)
      supabase.from('habits').select('*').eq('attempt_id', aid).order('day').then(({ data: h }) => { if (h) setHabits(h) })
    })
  }, [])

  const pct = (fn: (h: any) => boolean) => habits.length ? Math.round((habits.filter(fn).length / habits.length) * 100) : 0
  const col = (v: number) => v >= 80 ? '#34C759' : v >= 50 ? '#FF9500' : '#FF3B30'

  const mustHaves = [
    { l: 'OMAD', e: '🍽️', v: pct(h => h.omad || h.full_fast_day) },
    { l: 'Steps', e: '🚶', v: pct(h => (h.steps || 0) >= 10000) },
    { l: 'Fast 4pm', e: '🕓', v: pct(h => h.fast_post_4pm) },
  ]
  const bonus = [
    { l: 'Meditate', e: '🧘', v: pct(h => h.meditate) },
    { l: 'Sleep 6h', e: '😴', v: pct(h => (h.sleep_hours || 0) >= 6) },
    { l: 'No Content', e: '📵', v: pct(h => h.zero_content) },
    { l: 'Manifest', e: '✨', v: pct(h => h.manifest) },
    { l: 'Water 3L', e: '💧', v: pct(h => (h.water_liters || 0) >= 3) },
    { l: 'Workout', e: '💪', v: pct(h => h.workout) },
    { l: 'Zero Inbox', e: '📬', v: pct(h => h.zero_inbox) },
    { l: 'Yoga Sutras', e: '📖', v: pct(h => h.yoga_sutras) },
  ]

  const schedule = [
    { time: '4:15am – 5:00am', activity: 'Manifest, Yoga Sutras & 1L water' },
    { time: '5:00am – 6:30am', activity: 'Walk & Meditate' },
    { time: '6:30am – 7:30am', activity: 'Kids Time' },
    { time: '7:30am – 9:30am', activity: 'Gym or Padel' },
    { time: '9:30am – 2:00pm', activity: 'DreamSetGo Time' },
    { time: '2:00pm – 2:30pm', activity: 'Lunch' },
    { time: '2:30pm – 8:00pm', activity: 'DreamSetGo Time' },
    { time: '8:00pm – 10:00pm', activity: 'Kids Time' },
    { time: '10:00pm', activity: 'Sleep' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Habits</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>{habits.length} days tracked</p>

      {/* Perfect Day */}
      <div className="card perfect-day">
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#FF2D55' }}>✨ The Perfect Day</p>
        {schedule.map((s, i) => (
          <div key={i} className="perfect-slot">
            <span className="perfect-time">{s.time}</span>
            <span className="perfect-activity">{s.activity}</span>
          </div>
        ))}
      </div>

      <p className="gh">Must Have&apos;s</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {mustHaves.map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize: 18, marginBottom: 2 }}>{s.e}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: col(s.v) }}>{s.v}%</p>
            <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.l}</p>
          </div>
        ))}
      </div>

      <p className="gh">Bonus Habits</p>
      <div className="stat-grid">
        {bonus.map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize: 18, marginBottom: 2 }}>{s.e}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: col(s.v) }}>{s.v}%</p>
            <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
