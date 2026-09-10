'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const MUST = [
  { key: 'omad', label: 'OMAD', icon: '🍽️', check: (h: any) => h?.omad },
  { key: 'workout', label: 'Workout (10k)', icon: '🏃', check: (h: any) => h?.workout_10k },
  { key: 'clean', label: 'Clean Eating', icon: '🥗', check: (h: any) => h?.clean_eating },
]
const BONUS = [
  { key: 'meditate', label: 'Meditate', icon: '🧘', check: (h: any) => h?.meditate },
  { key: 'manifest', label: 'Manifest', icon: '✨', check: (h: any) => h?.manifest },
  { key: 'sleep', label: 'Sleep Well (6 Hrs)', icon: '😴', check: (h: any) => h?.sleep_well },
  { key: 'sutras', label: 'YogaSutras', icon: '📖', check: (h: any) => h?.yoga_sutras },
  { key: 'inbox', label: 'Zero Inbox', icon: '📬', check: (h: any) => h?.zero_inbox },
  { key: 'content', label: 'No Content', icon: '📵', check: (h: any) => h?.no_content },
  { key: 'water', label: 'Hydrated (3Ls)', icon: '💧', check: (h: any) => h?.hydrated },
]
const SCHEDULE = [
  { time: '4:15 – 5:00', act: 'Manifest, YogaSutras & 1L water' },
  { time: '5:00 – 6:30', act: 'Walk & Meditate' },
  { time: '6:30 – 7:30', act: 'Kids Time' },
  { time: '7:30 – 9:30', act: 'Gym or Padel' },
  { time: '9:30 – 2:00', act: 'DreamSetGo' },
  { time: '2:00 – 2:30', act: 'Lunch (Clean Eating)' },
  { time: '2:30 – 8:00', act: 'DreamSetGo' },
  { time: '8:00 – 10:00', act: 'Kids Time' },
  { time: '10:00pm', act: 'Sleep' },
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

  const total = habits.length
  const pct = (fn: (h: any) => boolean) => total ? Math.round((habits.filter(fn).length / total) * 100) : 0
  const col = (v: number) => v >= 80 ? '#34C759' : v >= 40 ? '#FF9500' : '#FF3B30'
  const thisWeek = habits.slice(-7)
  const lastWeek = habits.slice(-14, -7)
  const trend = (fn: (h: any) => boolean) => {
    if (lastWeek.length === 0) return null
    const tw = thisWeek.length ? Math.round((thisWeek.filter(fn).length / thisWeek.length) * 100) : 0
    const lw = Math.round((lastWeek.filter(fn).length / lastWeek.length) * 100)
    return { tw, lw, diff: tw - lw }
  }
  const avgScore = logs.length ? Math.round((logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length) * 10) / 10 : 0

  const HabitCard = ({ items, bg }: { items: typeof MUST, bg: string }) => (
    <div className="card">
      {items.map(s => {
        const v = pct(h => s.check(h)); const t = trend(h => s.check(h))
        return (
          <div key={s.key} className="row">
            <div className="row-icon" style={{ background: bg }}>{s.icon}</div>
            <div className="row-body">
              <div style={{ flex: 1 }}>
                <span className="row-label">{s.label}</span>
                <p style={{ fontSize: 10, color: '#AEAEB2' }}>{habits.filter(h => s.check(h)).length}/{total} days</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t && t.diff !== 0 && <span style={{ fontSize: 11, fontWeight: 600, color: t.diff > 0 ? '#34C759' : '#FF3B30' }}>{t.diff > 0 ? '↑' : '↓'}{Math.abs(t.diff)}%</span>}
                <span style={{ fontSize: 18, fontWeight: 700, color: col(v) }}>{v}%</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Habits</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>{total} days tracked · Avg {avgScore}/10</p>

      <div className="card" style={{ padding: '20px 16px', background: (avgScore*10) > 80 ? 'linear-gradient(135deg, #248A3D, #34C759)' : (avgScore*10) >= 40 ? 'linear-gradient(135deg, #FF9500, #FFB340)' : 'linear-gradient(135deg, #FF3B30, #FF6961)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>OVERALL AVERAGE</p><p style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginTop: 4 }}>{avgScore}<span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>/10</span></p></div>
          <div style={{ textAlign: 'right' }}><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Must Have = 70%</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Bonus = 30%</p></div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#FF2D55' }}>✨ The Perfect Day</p>
        {SCHEDULE.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: i < SCHEDULE.length-1 ? '0.5px solid rgba(60,60,67,0.06)' : 'none' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FF2D55', minWidth: 80 }}>{s.time}</span>
            <span style={{ fontSize: 12, color: '#555' }}>{s.act}</span>
          </div>
        ))}
      </div>

      <p className="gh">Must Have&apos;s · 70% of score</p>
      <HabitCard items={MUST} bg="rgba(255,45,85,0.12)" />

      <p className="gh">Bonus · 30% of score</p>
      <HabitCard items={BONUS} bg="rgba(52,199,89,0.12)" />

      <div className="card" style={{ padding: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>How Scoring Works</p>
        {[{ c: '#34C759', l: 'Green', d: 'Above 80% · Score above 8/10' }, { c: '#FF9500', l: 'Amber', d: '40% to 80% · Score 4 to 8' }, { c: '#FF3B30', l: 'Red', d: 'Below 40% · Score below 4' }].map(x => (
          <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: x.c, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{x.l[0]}</div>
            <p style={{ fontSize: 13 }}><span style={{ fontWeight: 600 }}>{x.l}</span> · <span style={{ color: '#8E8E93' }}>{x.d}</span></p>
          </div>
        ))}
      </div>

    </div>
  )
}
