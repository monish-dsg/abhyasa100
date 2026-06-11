'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtD(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }

const CM: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

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
      const att = data?.[0]?.attempt_number || 1
      setActiveAttempt(att); loadData(att)
    })
  }, [])

  const createNewAttempt = async () => {
    setCreating(true)
    await supabase.from('attempts').update({ status: 'abandoned' }).eq('attempt_number', activeAttempt)
    const newNum = (attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0) + 1
    await supabase.from('attempts').insert({ attempt_number: newNum, start_date: todayIST(), status: 'active' })
    setActiveAttempt(newNum); await loadData(newNum); setCreating(false)
  }

  const currentAttempt = attempts.find(a => a.attempt_number === activeAttempt)
  const startDate = currentAttempt?.start_date || todayIST()
  const today = todayIST()
  const dayNum = Math.max(1, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime()) / 864e5) + 1)
  const weekNum = Math.ceil(dayNum / 7)
  const totalWeeks = 100
  const pctWeeks = Math.min(100, Math.round((weekNum / totalWeeks) * 100))

  // Weight data
  const weights = logs.filter(l => l.weight > 0).map(l => ({ day: l.day, weight: l.weight }))
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null
  const startWeight = weights.length > 0 ? weights[0].weight : null
  const weightData = weights.map(w => ({ day: `D${w.day}`, weight: w.weight }))

  // Weekly scores
  const weeklyData: { week: number, score: number, color: string, days: number }[] = []
  for (let w = 1; w <= weekNum; w++) {
    const dayStart = (w - 1) * 7 + 1
    const dayEnd = w * 7
    const weekLogs = logs.filter(l => l.day >= dayStart && l.day <= dayEnd)
    if (weekLogs.length > 0) {
      const avgScore = weekLogs.reduce((a, l) => a + (l.score || 0), 0) / weekLogs.length
      const pct = avgScore * 10
      weeklyData.push({ week: w, score: Math.round(avgScore * 10) / 10, color: pct > 80 ? 'Green' : pct >= 40 ? 'Amber' : 'Red', days: weekLogs.length })
    }
  }

  // Per-habit daily grid (last 7 days)
  const recentDays = Array.from({ length: Math.min(7, dayNum) }, (_, i) => dayNum - 6 + i).filter(d => d >= 1)
  const habitRows = [
    { key: 'omad', label: 'OMAD/Fast', check: (h: any) => h?.omad || h?.full_fast_day },
    { key: 'physical', label: 'Physical', check: (h: any) => h?.physical_activity || (h?.steps >= 10000) || h?.workout },
    { key: 'clean', label: 'Ate Clean', check: (h: any) => h?.ate_clean || h?.fast_post_4pm },
    { key: 'meditate', label: 'Meditate', check: (h: any) => h?.meditate },
    { key: 'manifest', label: 'Manifest', check: (h: any) => h?.manifest },
    { key: 'sleep', label: 'Sleep 6h', check: (h: any) => h?.sleep_6hrs || (h?.sleep_hours >= 6) },
    { key: 'sutras', label: 'Sutras', check: (h: any) => h?.yoga_sutras },
    { key: 'inbox', label: 'Inbox 0', check: (h: any) => h?.zero_inbox },
    { key: 'content', label: 'No Content', check: (h: any) => h?.zero_content },
    { key: 'water', label: 'Water 3L', check: (h: any) => h?.water_3l || (h?.water_liters >= 3) },
  ]

  const avgScore = logs.length ? Math.round((logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length) * 10) / 10 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Attempt selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {attempts.map(a => (
          <button key={a.attempt_number} onClick={() => { setActiveAttempt(a.attempt_number); loadData(a.attempt_number) }}
            className={`attempt-btn ${activeAttempt === a.attempt_number ? 'attempt-active' : 'attempt-inactive'}`}>
            Attempt {a.attempt_number}
          </button>
        ))}
        <button onClick={createNewAttempt} disabled={creating}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1.5px dashed #D1D1D6', background: 'none', color: '#8E8E93', cursor: 'pointer', fontFamily: 'inherit' }}>
          {creating ? '...' : '+ New'}
        </button>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Abhyasa100</h1>

      {/* Progress */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>Week {weekNum} of 100 · Day {dayNum}</span>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>{fmtD(startDate)} → {fmtD(addDays(startDate, 699))}</span>
        </div>
        <div className="progress-track" style={{ marginBottom: 4 }}>
          <div className="progress-fill" style={{ width: `${pctWeeks}%`, background: 'linear-gradient(90deg, #FF2D55, #FF6482)' }} />
        </div>
        <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center' }}>{pctWeeks}% complete · {logs.length} days logged · Avg {avgScore}/10</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div className="stat">
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', letterSpacing: '0.04em' }}>START</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{startWeight || '—'}<span style={{ fontSize: 13, color: '#8E8E93' }}>kg</span></p>
        </div>
        <div className="stat">
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', letterSpacing: '0.04em' }}>NOW</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{latestWeight || '—'}<span style={{ fontSize: 13, color: '#8E8E93' }}>kg</span></p>
        </div>
        <div className="stat">
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', letterSpacing: '0.04em' }}>LOST</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: startWeight && latestWeight ? '#34C759' : '#8E8E93' }}>
            {startWeight && latestWeight ? `${(startWeight - latestWeight).toFixed(1)}` : '—'}<span style={{ fontSize: 13, color: '#8E8E93' }}>kg</span>
          </p>
        </div>
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
              <div key={w.week} style={{ background: CM[w.color], borderRadius: 8, padding: '8px 10px', textAlign: 'center', minWidth: 52 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>W{w.week}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{w.score}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{w.days}d</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Habit Daily Grid */}
      <div className="card" style={{ padding: 14, overflowX: 'auto' }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Last 7 Days</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '4px 6px', color: '#8E8E93', fontWeight: 600, fontSize: 10 }}></th>
              {recentDays.map(d => (
                <th key={d} style={{ textAlign: 'center', padding: '4px 3px', color: d === dayNum ? '#FF2D55' : '#8E8E93', fontWeight: 600, fontSize: 10 }}>
                  D{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Daily score row */}
            <tr style={{ borderBottom: '1px solid rgba(60,60,67,0.12)' }}>
              <td style={{ padding: '6px 6px', fontWeight: 600, fontSize: 11 }}>Score</td>
              {recentDays.map(d => {
                const log = logs.find(l => l.day === d)
                const sc = log?.score || 0
                const pctD = sc * 10
                const bg = log ? (pctD > 80 ? '#34C759' : pctD >= 40 ? '#FF9500' : '#FF3B30') : '#F2F2F7'
                return (
                  <td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}>
                    <div style={{ background: bg, borderRadius: 4, padding: '3px 0', color: log ? '#fff' : '#C7C7CC', fontWeight: 700, fontSize: 11 }}>
                      {log ? sc : '—'}
                    </div>
                  </td>
                )
              })}
            </tr>
            {/* Individual habit rows */}
            {habitRows.map(hr => (
              <tr key={hr.key}>
                <td style={{ padding: '5px 6px', fontSize: 11, color: '#555' }}>{hr.label}</td>
                {recentDays.map(d => {
                  const h = habits.find(hab => hab.day === d)
                  const done = h ? hr.check(h) : null
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '3px 2px' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 4, margin: '0 auto',
                        background: done === true ? '#34C759' : done === false ? '#FF3B30' : '#F2F2F7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#fff', fontWeight: 700,
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

      {/* Day Calendar */}
      <div className="card" style={{ padding: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Calendar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, fontSize: 10 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', color: '#8E8E93', fontWeight: 600, padding: 2 }}>{d}</div>
          ))}
          {Array.from({ length: Math.min(dayNum, 49) }, (_, i) => i + 1).map(d => {
            const log = logs.find(l => l.day === d)
            const bg = log ? (CM[log.color] || '#F2F2F7') : '#F2F2F7'
            return <div key={d} style={{ background: bg, borderRadius: 4, padding: '4px 0', textAlign: 'center', color: log ? '#fff' : '#C7C7CC', fontWeight: 700, fontSize: 9 }}>{d}</div>
          })}
        </div>
      </div>

      {/* Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <p style={{ fontSize: 15, fontWeight: 600, padding: '12px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>Log</p>
        {logs.length === 0 ? <p style={{ padding: 24, textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>No entries yet</p> :
          [...logs].reverse().slice(0, 14).map(l => {
            const calcDate = addDays(startDate, l.day - 1)
            return (
              <div key={l.id} className="log-row">
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Day {l.day}</span>
                  <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{fmtD(calcDate)}</span>
                  {l.weight > 0 && <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{l.weight}kg</span>}
                </div>
                <span className="badge" style={{ background: CM[l.color] || '#E5E5EA' }}>{l.score}/10</span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
