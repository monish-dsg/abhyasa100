'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

const CM: Record<string,{bg:string,t:string}> = {
  'Perfect':{bg:'#248A3D',t:'#fff'}, 'Solid':{bg:'#34C759',t:'#fff'},
  'Slipped':{bg:'#FF9500',t:'#fff'}, 'Missed':{bg:'#FF3B30',t:'#fff'},
}

function getColor(h: any, hasData: boolean) {
  if (!hasData) return { color: 'Missed', score: 0 }
  const mustHaves = [h?.omad || h?.full_fast_day, (h?.steps || 0) >= 10000, h?.fast_post_4pm]
  const missedMust = mustHaves.filter(v => !v).length
  const bonus = [h?.meditate, (h?.sleep_hours || 0) >= 6, h?.zero_content, h?.manifest, (h?.water_liters || 0) >= 3, h?.workout, h?.zero_inbox, h?.yoga_sutras]
  const bonusDone = bonus.filter(Boolean).length
  if (missedMust === 0 && bonusDone === 8) return { color: 'Perfect', score: 11 }
  if (missedMust === 0) return { color: 'Solid', score: 3 + bonusDone }
  if (missedMust >= 2) return { color: 'Slipped', score: Math.max(0, 3 - missedMust) + bonusDone }
  return { color: 'Solid', score: 2 + bonusDone }
}

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0]
}
function fmtD(d: string) { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [activeAttempt, setActiveAttempt] = useState<number>(1)
  const [creating, setCreating] = useState(false)

  const loadData = async (attemptId: number) => {
    const { data: a } = await supabase.from('attempts').select('*').order('attempt_number')
    if (a) setAttempts(a)
    const { data: l } = await supabase.from('daily_logs').select('*').eq('attempt_id', attemptId).order('day')
    if (l) setLogs(l)
    const { data: h } = await supabase.from('habits').select('*').eq('attempt_id', attemptId).order('day')
    if (h) setHabits(h)
  }

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => {
      const att = data?.[0]?.attempt_number || 1
      setActiveAttempt(att)
      loadData(att)
    })
  }, [])

  const createNewAttempt = async () => {
    setCreating(true)
    // Mark current attempt as abandoned
    await supabase.from('attempts').update({ status: 'abandoned' }).eq('attempt_number', activeAttempt)
    const newNum = (attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0) + 1
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('attempts').insert({ attempt_number: newNum, start_date: today, status: 'active' })
    setActiveAttempt(newNum)
    await loadData(newNum)
    setCreating(false)
  }

  const currentAttempt = attempts.find(a => a.attempt_number === activeAttempt)
  const startDate = currentAttempt?.start_date || new Date().toISOString().split('T')[0]
  const endDate = addDays(startDate, 99)
  const today = new Date().toISOString().split('T')[0]
  const daysElapsed = Math.max(0, Math.floor((new Date(today).getTime() - new Date(startDate).getTime()) / 864e5) + 1)
  const pctComplete = Math.min(100, Math.round((logs.length / 100) * 100))

  const latest = logs[logs.length - 1]
  const d1 = logs.find(l => l.day === 1)
  const sw = d1?.weight || latest?.weight || 0

  // Weight fallback: use last known weight
  const getWeight = (day: number) => {
    const log = logs.find(l => l.day === day)
    if (log?.weight) return log.weight
    const prev = logs.filter(l => l.day < day && l.weight).sort((a, b) => b.day - a.day)
    return prev[0]?.weight || 0
  }
  const currentWeight = latest ? getWeight(latest.day) : 0
  const tw = 66
  const prog = sw ? Math.min(100, Math.max(0, ((sw - currentWeight) / (sw - tw)) * 100)) : 0
  const avg = logs.length ? (logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length).toFixed(1) : '—'

  const perfect = logs.filter(l => l.color === 'Perfect').length
  const solid = logs.filter(l => l.color === 'Solid').length
  const slipped = logs.filter(l => l.color === 'Slipped').length
  const missed = logs.filter(l => l.color === 'Missed').length

  // Graph data
  const weightData = logs.filter(l => l.weight).map(l => ({ day: `D${l.day}`, weight: l.weight }))
  const stepsData = habits.map(h => ({ day: `D${h.day}`, steps: h.steps || 0 }))
  const omadData = habits.map(h => ({ day: `D${h.day}`, done: (h.omad || h.full_fast_day) ? 1 : 0, missed: (h.omad || h.full_fast_day) ? 0 : 1 }))
  const macroData = habits.filter(h => h.protein_pct).map(h => ({ day: `D${h.day}`, protein: h.protein_pct, fat: h.fat_pct, carbs: h.carbs_pct }))

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
          {creating ? '...' : '+ New Attempt'}
        </button>
      </div>

      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Abhyasa100</h1>

      {/* Dates & Progress */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>Day 1: {fmtD(startDate)}</span>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>Day 100: {fmtD(endDate)}</span>
        </div>
        <div className="progress-track" style={{ marginBottom: 4 }}>
          <div className="progress-fill" style={{ width: `${pctComplete}%`, background: 'linear-gradient(90deg, #FF2D55, #FF6482)' }} />
        </div>
        <p style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center' }}>{pctComplete}% complete · {logs.length}/100 days logged · Day {daysElapsed} today</p>
      </div>

      {/* Stats */}
      <div className="stat-grid stat-grid-4">
        {[{ l: 'START', v: sw ? `${sw}` : '—', u: 'kg' }, { l: 'CURRENT', v: currentWeight ? `${currentWeight}` : '—', u: 'kg' }, { l: 'TARGET', v: `${tw}`, u: 'kg' }, { l: 'AVG', v: avg, u: '/10' }].map(s => (
          <div key={s.l} className="stat">
            <p style={{ fontSize: 10, fontWeight: 600, color: '#8E8E93', letterSpacing: '0.04em', marginBottom: 4 }}>{s.l}</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{s.v}<span style={{ fontSize: 13, color: '#8E8E93' }}>{s.u}</span></p>
          </div>
        ))}
      </div>

      {/* Weight Progress */}
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Weight</span>
          <span style={{ fontSize: 13, color: '#FF2D55' }}>{(sw && currentWeight) ? `${(sw - currentWeight).toFixed(1)} kg lost` : 'Awaiting Day 1'}</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${prog}%`, background: 'linear-gradient(90deg, #FF2D55, #FF6482)' }} /></div>
      </div>

      {/* Color counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }} className="stat-grid-4">
        {[{ c: perfect, bg: '#248A3D', l: 'Perfect' }, { c: solid, bg: '#34C759', l: 'Solid' }, { c: slipped, bg: '#FF9500', l: 'Slipped' }, { c: missed, bg: '#FF3B30', l: 'Missed' }].map(x => (
          <div key={x.l} style={{ background: x.bg, borderRadius: 10, padding: '14px 6px', textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{x.c}</p>
            <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8, marginTop: 2 }}>{x.l}</p>
          </div>
        ))}
      </div>

      {/* Weight Graph */}
      {weightData.length > 0 && (
        <div className="card graph-card">
          <h3>Weight Trend</h3>
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

      {/* Steps Graph */}
      {stepsData.length > 0 && (
        <div className="card graph-card">
          <h3>Daily Steps</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stepsData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip />
              <Bar dataKey="steps" fill="#007AFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* OMAD Graph */}
      {omadData.length > 0 && (
        <div className="card graph-card">
          <h3>OMAD Tracker</h3>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={omadData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="done" stackId="a" fill="#34C759" radius={[4, 4, 0, 0]} />
              <Bar dataKey="missed" stackId="a" fill="#FF3B30" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Macros Graph */}
      {macroData.length > 0 && (
        <div className="card graph-card">
          <h3>Daily Macros</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={macroData}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={35} />
              <Tooltip />
              <Bar dataKey="protein" stackId="a" fill="#FF2D55" />
              <Bar dataKey="fat" stackId="a" fill="#FF9500" />
              <Bar dataKey="carbs" stackId="a" fill="#007AFF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Calendar */}
      <div className="card" style={{ padding: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Calendar</p>
        <div className="cal-grid">
          {Array.from({ length: 100 }, (_, i) => {
            const log = logs.find(l => l.day === i + 1)
            const c = log ? CM[log.color] : null
            return <div key={i} className="cal-cell" style={{ background: c ? c.bg : '#F2F2F7', color: c ? c.t : '#C7C7CC' }}>{i + 1}</div>
          })}
        </div>
      </div>

      {/* Log */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <p style={{ fontSize: 15, fontWeight: 600, padding: '12px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>Log</p>
        {logs.length === 0 ? <p style={{ padding: 24, textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>No entries yet</p> :
          [...logs].reverse().map((l, i) => (
            <div key={l.id} className="log-row">
              <div><span style={{ fontSize: 15, fontWeight: 600 }}>Day {l.day}</span><span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{l.date}</span>{l.weight > 0 && <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{l.weight}kg</span>}</div>
              <span className="badge" style={{ background: CM[l.color]?.bg || '#E5E5EA' }}>{l.score}/11</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
