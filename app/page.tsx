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
function fmtShort(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }

const CM: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

const HABIT_LABELS = [
  { key: 'meals', label: 'Meals ≤7', check: (h: any) => (h?.meals_count || 0) <= 7 && (h?.meals_count || 0) > 0 },
  { key: 'steps', label: 'Steps 70k', check: (h: any) => (h?.steps_total || 0) >= 70000 },
  { key: 'workout', label: 'Workouts ≥5', check: (h: any) => (h?.workouts_count || 0) >= 5 },
  { key: 'clean', label: 'Ate Clean', check: (h: any) => h?.clean_eating },
  { key: 'meditate', label: 'Meditate ×7', check: (h: any) => (h?.meditate_count || 0) >= 7 },
  { key: 'manifest', label: 'Manifest ×7', check: (h: any) => (h?.manifest_count || 0) >= 7 },
  { key: 'sleep', label: 'Sleep 50h', check: (h: any) => (h?.sleep_total_hours || 0) >= 50 },
  { key: 'sutras', label: 'YogaSutras', check: (h: any) => h?.yoga_sutras },
  { key: 'inbox', label: 'Zero Inbox', check: (h: any) => h?.zero_inbox },
  { key: 'content', label: 'Content <10h', check: (h: any) => (h?.content_hours || 999) <= 10 },
  { key: 'water', label: 'Hydrated', check: (h: any) => h?.hydrated },
]

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [activeAttempt, setActiveAttempt] = useState(1)
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
  const weekNum = Math.max(1, Math.ceil((new Date(today + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime() + 864e5) / (7 * 864e5)))

  const weights = logs.filter(l => l.weight > 0).map(l => ({ week: l.day, weight: l.weight }))
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null
  const startWeight = weights.length > 0 ? weights[0].weight : null
  const weightData = weights.map(w => ({ wk: `W${w.week}`, weight: w.weight }))

  const avgScore = logs.length ? Math.round((logs.reduce((a, l) => a + (l.score || 0), 0) / logs.length) * 10) / 10 : 0
  const greenW = logs.filter(l => l.color === 'Green').length
  const amberW = logs.filter(l => l.color === 'Amber').length
  const redW = logs.filter(l => l.color === 'Red').length

  const recentWeeks = Array.from({ length: Math.min(4, weekNum) }, (_, i) => weekNum - 3 + i).filter(w => w >= 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Attempt */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {attempts.map(a => (
          <button key={a.attempt_number} onClick={() => { setActiveAttempt(a.attempt_number); loadData(a.attempt_number) }}
            className={`attempt-btn ${activeAttempt === a.attempt_number ? 'attempt-active' : 'attempt-inactive'}`}>#{a.attempt_number}</button>
        ))}
        <button onClick={createNewAttempt} disabled={creating} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px dashed #D1D1D6', background: 'none', color: '#8E8E93', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
      </div>

      {/* Hero */}
      <div className="card" style={{ padding: '24px 20px', background: 'linear-gradient(135deg, #FF2D55, #FF6482, #FF8FA3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>ABHYASA100 · WEEKLY</p>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginTop: 4 }}>Week {weekNum} <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>of 100</span></h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{fmtD(startDate)} → {fmtD(addDays(startDate, 699))}</p>
        <div className="progress-track" style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)' }}>
          <div className="progress-fill" style={{ width: `${Math.min(100, weekNum)}%`, background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{logs.length} weeks logged</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Avg {avgScore}/10</span>
        </div>
      </div>

      {/* Weight Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'START', value: startWeight || '—', color: '#8E8E93' },
          { label: 'NOW', value: latestWeight || '—', color: '#FF2D55' },
          { label: 'LOST', value: startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : '—', color: '#34C759' },
        ].map(s => (
          <div key={s.label} className="stat">
            <p style={{ fontSize: 9, fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 2 }}>{s.value}<span style={{ fontSize: 12, color: '#C7C7CC' }}>kg</span></p>
          </div>
        ))}
      </div>

      {/* Week Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[{ count: greenW, bg: '#34C759', label: 'Green' }, { count: amberW, bg: '#FF9500', label: 'Amber' }, { count: redW, bg: '#FF3B30', label: 'Red' }].map(x => (
          <div key={x.label} style={{ background: x.bg, borderRadius: 12, padding: '14px 8px', textAlign: 'center', color: '#fff' }}>
            <p style={{ fontSize: 24, fontWeight: 700 }}>{x.count}</p>
            <p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{x.label} weeks</p>
          </div>
        ))}
      </div>

      {/* Weight Journey */}
      {weightData.length > 1 && (
        <div className="card graph-card">
          <h3>Weight Journey</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData}>
              <XAxis dataKey="wk" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={35} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#FF2D55" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Scores */}
      {logs.length > 0 && (
        <div className="card" style={{ padding: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Weekly Scores</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {logs.map(l => (
              <div key={l.day} style={{ background: CM[l.color] || '#E5E5EA', borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>W{l.day}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{l.score || 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Habit Grid - Last 4 Weeks */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: 14, overflowX: 'auto' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Recent Weeks</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '4px 6px', color: '#AEAEB2', fontWeight: 600, fontSize: 9 }}></th>
                {recentWeeks.map(w => (
                  <th key={w} style={{ textAlign: 'center', padding: '4px 2px', color: w === weekNum ? '#FF2D55' : '#AEAEB2', fontWeight: 700, fontSize: 10 }}>W{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '2px solid rgba(60,60,67,0.08)' }}>
                <td style={{ padding: '6px 6px', fontWeight: 700, fontSize: 11, color: '#FF2D55' }}>Score</td>
                {recentWeeks.map(w => {
                  const log = logs.find(l => l.day === w)
                  return (
                    <td key={w} style={{ textAlign: 'center', padding: '4px 2px' }}>
                      <div style={{ background: log ? (CM[log.color] || '#E5E5EA') : '#F2F2F7', borderRadius: 6, padding: '4px 0', color: log ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 12 }}>
                        {log?.score || '—'}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {HABIT_LABELS.map(hr => (
                <tr key={hr.key}>
                  <td style={{ padding: '4px 6px', fontSize: 10, color: '#555', fontWeight: 500 }}>{hr.label}</td>
                  {recentWeeks.map(w => {
                    const h = habits.find(hab => hab.day === w)
                    const done = h ? hr.check(h) : null
                    return (
                      <td key={w} style={{ textAlign: 'center', padding: '2px 2px' }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, margin: '0 auto', background: done === true ? '#34C759' : done === false ? '#FF3B30' : '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
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

      {/* Calendar Grid */}
      <div className="card" style={{ padding: 14 }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>100 Weeks</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 3 }}>
          {Array.from({ length: 100 }, (_, i) => i + 1).map(w => {
            const log = logs.find(l => l.day === w)
            return <div key={w} style={{ background: log ? (CM[log.color] || '#F2F2F7') : '#F2F2F7', borderRadius: 4, padding: '5px 0', textAlign: 'center', color: log ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 8 }}>{w}</div>
          })}
        </div>
      </div>

      {/* Recent */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <p style={{ fontSize: 15, fontWeight: 600, padding: '12px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>Recent</p>
        {logs.length === 0 ? <p style={{ padding: 24, textAlign: 'center', color: '#8E8E93' }}>No weeks logged yet</p> :
          [...logs].reverse().slice(0, 10).map(l => {
            const wdFrom = addDays(startDate, (l.day - 1) * 7)
            const wdTo = addDays(startDate, (l.day - 1) * 7 + 6)
            return (
              <div key={l.id} className="log-row">
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Week {l.day}</span>
                  <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{fmtShort(wdFrom)} – {fmtShort(wdTo)}</span>
                  {l.weight > 0 && <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 6 }}>{l.weight}kg</span>}
                </div>
                <span className="badge" style={{ background: CM[l.color] || '#E5E5EA', fontSize: 12, padding: '3px 10px' }}>{l.score}/10</span>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
