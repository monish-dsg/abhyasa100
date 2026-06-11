'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

function todayIST(): string {
  const now = new Date(); const ist = new Date(now.getTime() + 5.5*60*60*1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtD(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) }

const CM: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

const HABIT_LABELS = [
  { key: 'omad', label: 'OMAD', check: (h: any) => h?.omad },
  { key: 'workout', label: 'Workout', check: (h: any) => h?.workout_10k || h?.physical_activity || h?.workout },
  { key: 'clean', label: 'Clean Eating', check: (h: any) => h?.clean_eating || h?.ate_clean || h?.fast_post_4pm },
  { key: 'meditate', label: 'Meditate', check: (h: any) => h?.meditate },
  { key: 'manifest', label: 'Manifest', check: (h: any) => h?.manifest },
  { key: 'sleep', label: 'Sleep Well', check: (h: any) => h?.sleep_well || h?.sleep_6hrs || (h?.sleep_hours >= 6) },
  { key: 'sutras', label: 'YogaSutras', check: (h: any) => h?.yoga_sutras },
  { key: 'inbox', label: 'Zero Inbox', check: (h: any) => h?.zero_inbox },
  { key: 'content', label: 'No Content', check: (h: any) => h?.no_content || h?.zero_content },
  { key: 'water', label: 'Hydrated', check: (h: any) => h?.hydrated || h?.water_3l || (h?.water_liters >= 3) },
]

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [activeAttempt, setActiveAttempt] = useState<number>(1)
  const [creating, setCreating] = useState(false)

  const loadData = async (aid: number) => {
    const { data: a } = await supabase.from('attempts').select('*').order('attempt_number')
    if (a) setAttempts(a)
    const { data: l } = await supabase.from('daily_logs').select('*').eq('attempt_id', aid).order('day')
    if (l) setLogs(l)
    const { data: h } = await supabase.from('habits').select('*').eq('attempt_id', aid).order('day')
    if (h) setHabits(h)
  }

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => {
      const att = data?.[0]?.attempt_number || 1; setActiveAttempt(att); loadData(att)
    })
  }, [])

  const createNewAttempt = async () => {
    setCreating(true)
    await supabase.from('attempts').update({ status: 'abandoned' }).eq('attempt_number', activeAttempt)
    const newNum = (attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0) + 1
    await supabase.from('attempts').insert({ attempt_number: newNum, start_date: todayIST(), status: 'active' })
    setActiveAttempt(newNum); await loadData(newNum); setCreating(false)
  }

  const ca = attempts.find(a => a.attempt_number === activeAttempt)
  const startDate = ca?.start_date || todayIST()
  const today = todayIST()
  const dayNum = Math.max(1, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime()) / 864e5) + 1)
  const weekNum = Math.ceil(dayNum / 7)

  // Weight
  const weights = logs.filter(l => l.weight > 0).map(l => ({ day: l.day, weight: l.weight }))
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null
  const startWeight = weights.length > 0 ? weights[0].weight : null
  const weightData = weights.map(w => ({ day: `D${w.day}`, weight: w.weight }))

  // Averages
  const avgScore = logs.length ? Math.round((logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length) * 10) / 10 : 0
  const greenDays = logs.filter(l => l.color === 'Green').length
  const amberDays = logs.filter(l => l.color === 'Amber').length
  const redDays = logs.filter(l => l.color === 'Red').length

  // Weekly scores
  const weeklyData: { week: number, score: number, color: string, days: number }[] = []
  for (let w = 1; w <= weekNum; w++) {
    const wLogs = logs.filter(l => l.day >= (w-1)*7+1 && l.day <= w*7)
    if (wLogs.length > 0) {
      const avg = wLogs.reduce((a, l) => a + (l.score || 0), 0) / wLogs.length
      const p = avg * 10
      weeklyData.push({ week: w, score: Math.round(avg * 10) / 10, color: p > 80 ? 'Green' : p >= 40 ? 'Amber' : 'Red', days: wLogs.length })
    }
  }

  // Recent days for habit grid
  const recentDays = Array.from({ length: Math.min(7, dayNum) }, (_, i) => dayNum - 6 + i).filter(d => d >= 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Attempt selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {attempts.map(a => (
          <button key={a.attempt_number} onClick={() => { setActiveAttempt(a.attempt_number); loadData(a.attempt_number) }}
            className={`attempt-btn ${activeAttempt === a.attempt_number ? 'attempt-active' : 'attempt-inactive'}`}>
            #{a.attempt_number}
          </button>
        ))}
        <button onClick={createNewAttempt} disabled={creating}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px dashed #D1D1D6', background: 'none', color: '#8E8E93', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
      </div>

      {/* Hero */}
      <div className="card" style={{ padding: '24px 20px', background: 'linear-gradient(135deg, #FF2D55, #FF6482, #FF8FA3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>ABHYASA100</p>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginTop: 4 }}>Week {weekNum} <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>of 100</span></h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Day {dayNum} · {fmtD(startDate)} → {fmtD(addDays(startDate, 699))}</p>
        <div className="progress-track" style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)' }}>
          <div className="progress-fill" style={{ width: `${Math.min(100, Math.round(weekNum))}%`, background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{logs.length} days logged</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Avg {avgScore}/10</span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'START', value: startWeight || '—', unit: 'kg', color: '#8E8E93' },
          { label: 'NOW', value: latestWeight || '—', unit: 'kg', color: '#FF2D55' },
          { label: 'LOST', value: startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : '—', unit: 'kg', color: '#34C759' },
        ].map(s => (
          <div key={s.label} className="stat">
            <p style={{ fontSize: 9, fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}<span style={{ fontSize: 12, color: '#C7C7CC' }}>{s.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Day Color Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { count: greenDays, bg: '#34C759', label: 'Green' },
          { count: amberDays, bg: '#FF9500', label: 'Amber' },
          { count: redDays, bg: '#FF3B30', label: 'Red' },
        ].map(x => (
          <div key={x.label} style={{ background: x.bg, borderRadius: 12, padding: '14px 8px', textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{x.count}</p>
            <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{x.label} days</p>
          </div>
        ))}
      </div>

      {/* Weight Journey */}
      {weightData.length > 1 && (
        <div className="card graph-card">
          <h3>Weight Journey</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={35} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#FF2D55" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Scores */}
      {weeklyData.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Weekly Scores</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {weeklyData.map(w => (
              <div key={w.week} style={{ background: CM[w.color], borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>WEEK {w.week}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{w.score}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{w.days} days</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit Grid - Last 7 Days */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: 14, overflowX: 'auto' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Last 7 Days</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 6px', color: '#AEAEB2', fontWeight: 600, fontSize: 9 }}></th>
                {recentDays.map(d => (
                  <th key={d} style={{ textAlign: 'center', padding: '4px 2px', color: d === dayNum ? '#FF2D55' : '#AEAEB2', fontWeight: 700, fontSize: 10 }}>D{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Score row */}
              <tr style={{ borderBottom: '2px solid rgba(60,60,67,0.08)' }}>
                <td style={{ padding: '6px 6px', fontWeight: 700, fontSize: 11, color: '#FF2D55' }}>Score</td>
                {recentDays.map(d => {
                  const log = logs.find(l => l.day === d)
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <div style={{ background: log ? (CM[log.color] || '#E5E5EA') : '#F2F2F7', borderRadius: 6, padding: '4px 0', color: log ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 12 }}>
                        {log ? log.score : '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {/* Habit rows */}
              {HABIT_LABELS.map(hr => (
                <tr key={hr.key}>
                  <td style={{ padding: '4px 6px', fontSize: 10, color: '#555', fontWeight: 500 }}>{hr.label}</td>
                  {recentDays.map(d => {
                    const h = habits.find(hab => hab.day === d)
                    const done = h ? hr.check(h) : null
                    return (
                      <td key={d} style={{ textAlign: 'center', padding: '2px 2px' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, margin: '0 auto',
                          background: done === true ? '#34C759' : done === false ? '#FF3B30' : '#F2F2F7',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: '#fff', fontWeight: 700,
                        }}>
                          {done === true ? '✓' : done === false ? '✗' : ''}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar */}
      <div className="card" style={{ padding: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Calendar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', color: '#AEAEB2', fontWeight: 700, padding: 2, fontSize: 9 }}>{d}</div>
          ))}
          {Array.from({ length: Math.min(dayNum, 49) }, (_, i) => i + 1).map(d => {
            const log = logs.find(l => l.day === d)
            return <div key={d} style={{ background: log ? (CM[log.color] || '#F2F2F7') : '#F2F2F7', borderRadius: 5, padding: '5px 0', textAlign: 'center', color: log ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 9 }}>{d}</div>
          })}
        </div>
      </div>

      {/* Recent Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <p style={{ fontSize: 15, fontWeight: 600, padding: '12px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>Recent</p>
        {logs.length === 0 ? <p style={{ padding: 24, textAlign: 'center', color: '#8E8E93' }}>No entries yet. Go to Add and log Day 1!</p> :
          [...logs].reverse().slice(0, 10).map(l => (
            <div key={l.id} className="log-row">
              <div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Day {l.day}</span>
                <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{fmtD(addDays(startDate, l.day - 1))}</span>
                {l.weight > 0 && <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 6 }}>{l.weight}kg</span>}
              </div>
              <span className="badge" style={{ background: CM[l.color] || '#E5E5EA', fontSize: 12, padding: '3px 10px' }}>{l.score}/10</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
