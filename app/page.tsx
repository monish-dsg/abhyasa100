'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'

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

const CM: Record<string, string> = { Green: '#34C759', Amber: '#FF9500', Red: '#FF3B30' }
const ZONES = [
  { z: 1, f: 82, t: 79, l: 'Zone 1', c: '#FF3B30' },
  { z: 2, f: 79, t: 76, l: 'Zone 2', c: '#FF9500' },
  { z: 3, f: 76, t: 73, l: 'Zone 3', c: '#FFD60A' },
  { z: 4, f: 73, t: 70, l: 'Zone 4', c: '#34C759' },
  { z: 5, f: 70, t: 67, l: 'Zone 5', c: '#30D158' },
]
const SUTRAS = [
  { r: '1.2', t: 'Yoga is the cessation of the movements of the mind.' },
  { r: '1.12', t: 'Practice and non-attachment are the means to still the mind.' },
  { r: '1.14', t: 'Practice becomes firm when continued for a long time, without break, and with devotion.' },
  { r: '1.21', t: 'Success is nearest to those whose efforts are intense and sincere.' },
  { r: '1.33', t: 'Cultivate friendliness toward the happy, compassion toward the suffering.' },
  { r: '2.1', t: 'Kriya Yoga consists of tapas, svadhyaya, and Ishvara pranidhana.' },
  { r: '2.16', t: 'Future suffering can be prevented. Yoga is a prevention practice.' },
  { r: '2.33', t: 'When disturbed by negative thoughts, cultivate the opposite.' },
  { r: '2.42', t: 'From contentment, unsurpassed happiness is gained.' },
  { r: '2.46', t: 'Asana is a seat that is steady and comfortable.' },
  { r: '4.34', t: 'Liberation is consciousness established in its own power.' },
  { r: 'VBT.10', t: 'Wherever the mind goes, Shiva is already there. Stop searching.' },
  { r: 'VBT.32', t: 'When joy arises from music or taste — stay with the joy itself.' },
  { r: 'VBT.42', t: 'Whatever arises, enter it completely. In total entry, it dissolves.' },
  { r: 'VBT.50', t: 'There is no bondage. There is no liberation. The mirror is never touched.' },
  { r: '1.1', t: 'Now, the teaching of Yoga. You are ready.' },
  { r: '2.28', t: 'Through practice of the limbs, impurity is destroyed and the light dawns.' },
  { r: '1.3', t: 'Then the Seer abides in its own nature.' },
  { r: '3.4', t: 'Dharana, dhyana, and samadhi together constitute samyama.' },
  { r: 'VBT.45', t: 'By whatever means, arrive at the thought-free state. The method does not matter.' },
]
const HL = [
  { k: 'omad', l: 'OMAD', c: (h: any) => h?.omad },
  { k: 'workout', l: 'Workout', c: (h: any) => h?.workout_10k },
  { k: 'clean', l: 'Clean Eating', c: (h: any) => h?.clean_eating },
  { k: 'meditate', l: 'Meditate', c: (h: any) => h?.meditate },
  { k: 'manifest', l: 'Manifest', c: (h: any) => h?.manifest },
  { k: 'sleep', l: 'Sleep Well', c: (h: any) => h?.sleep_well },
  { k: 'sutras', l: 'YogaSutras', c: (h: any) => h?.yoga_sutras },
  { k: 'inbox', l: 'Zero Inbox', c: (h: any) => h?.zero_inbox },
  { k: 'content', l: 'No Content', c: (h: any) => h?.no_content },
  { k: 'water', l: 'Hydrated', c: (h: any) => h?.hydrated },
]

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [attempts, setAttempts] = useState<any[]>([])
  const [activeAttempt, setActiveAttempt] = useState(1)
  const [creating, setCreating] = useState(false)
  const loadData = async (aid: number) => {
    const { data: a } = await supabase.from('attempts').select('*').order('attempt_number'); if (a) setAttempts(a)
    const { data: l } = await supabase.from('daily_logs').select('*').eq('attempt_id', aid).order('day'); if (l) setLogs(l)
    const { data: h } = await supabase.from('habits').select('*').eq('attempt_id', aid).order('day'); if (h) setHabits(h)
  }
  useEffect(() => { supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => { const att = data?.[0]?.attempt_number || 1; setActiveAttempt(att); loadData(att) }) }, [])
  const createNewAttempt = async () => { setCreating(true); await supabase.from('attempts').update({ status: 'abandoned' }).eq('attempt_number', activeAttempt); const n = (attempts.length > 0 ? Math.max(...attempts.map(a => a.attempt_number)) : 0) + 1; await supabase.from('attempts').insert({ attempt_number: n, start_date: todayIST(), status: 'active' }); setActiveAttempt(n); await loadData(n); setCreating(false) }

  const ca = attempts.find(a => a.attempt_number === activeAttempt)
  const startDate = ca?.start_date || todayIST()
  const today = todayIST()
  const dayNum = Math.max(1, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(startDate + 'T12:00:00').getTime()) / 864e5) + 1)
  const weekNum = Math.ceil(dayNum / 7)

  function calcScore(h: any) {
    if (!h) return { score: 0, color: 'Red' }
    const m = [h.omad, h.workout_10k, h.clean_eating].filter(Boolean).length
    const b = [h.meditate, h.manifest, h.sleep_well, h.yoga_sutras, h.zero_inbox, h.no_content, h.hydrated].filter(Boolean).length
    const s = Math.round(((m/3)*7+(b/7)*3)*10)/10; const p = s*10
    return { score: s, color: p > 80 ? 'Green' : p >= 40 ? 'Amber' : 'Red' }
  }

  const dayData = logs.map(l => { const h = habits.find(x => x.day === l.day); const { score, color } = h ? calcScore(h) : { score: l.score||0, color: l.color||'Red' }; return { ...l, score, color } })
  const weights = dayData.filter(l => l.weight > 0).map(l => ({ day: l.day, weight: l.weight }))
  const lw = weights.length > 0 ? weights[weights.length-1].weight : null
  const sw = weights.length > 0 ? weights[0].weight : null
  const wd = weights.map(w => ({ day: `D${w.day}`, weight: w.weight }))
  const avg = dayData.length ? Math.round((dayData.reduce((a,l) => a+(l.score||0),0)/dayData.length)*10)/10 : 0
  const gD = dayData.filter(l => l.color==='Green').length, aD = dayData.filter(l => l.color==='Amber').length, rD = dayData.filter(l => l.color==='Red').length

  // Streak
  let streak = 0; for (let d = dayNum; d >= 1; d--) { if (dayData.find(x => x.day === d)) streak++; else break }
  const perfect = dayData.filter(d => d.score === 10).length

  // Weight zone
  const cz = lw ? (lw <= 67 ? { l: 'Goal Achieved! 🏆', c: '#5856D6' } : ZONES.find(z => lw <= z.f && lw > z.t) || ZONES[0]) : null
  const wpct = lw ? Math.max(0, Math.min(100, Math.round(((82-lw)/(82-67))*100))) : 0

  // Weekly
  const cwk = dayData.filter(l => l.day >= (weekNum-1)*7+1 && l.day <= weekNum*7)
  const lwk = dayData.filter(l => l.day >= (weekNum-2)*7+1 && l.day <= (weekNum-1)*7)
  const twAvg = cwk.length ? Math.round((cwk.reduce((a,d) => a+d.score,0)/cwk.length)*10)/10 : 0
  const lwAvg = lwk.length ? Math.round((lwk.reduce((a,d) => a+d.score,0)/lwk.length)*10)/10 : 0
  const best = cwk.length ? cwk.reduce((b,d) => d.score > b.score ? d : b, cwk[0]) : null
  const worst = cwk.length ? cwk.reduce((w,d) => d.score < w.score ? d : w, cwk[0]) : null

  const wkData: { week: number, score: number, color: string, days: number }[] = []
  for (let w = 1; w <= weekNum; w++) { const ds = dayData.filter(l => l.day >= (w-1)*7+1 && l.day <= w*7); if (ds.length > 0) { const a = ds.reduce((s,l) => s+(l.score||0),0)/ds.length; const p = a*10; wkData.push({ week: w, score: Math.round(a*10)/10, color: p > 80 ? 'Green' : p >= 40 ? 'Amber' : 'Red', days: ds.length }) } }

  const ts = SUTRAS[Math.floor(new Date(today).getTime()/864e5) % SUTRAS.length]
  const rec = Array.from({ length: Math.min(7, dayNum) }, (_, i) => dayNum-6+i).filter(d => d >= 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {attempts.map(a => (<button key={a.attempt_number} onClick={() => { setActiveAttempt(a.attempt_number); loadData(a.attempt_number) }} className={`attempt-btn ${activeAttempt === a.attempt_number ? 'attempt-active' : 'attempt-inactive'}`}>#{a.attempt_number}</button>))}
        <button onClick={createNewAttempt} disabled={creating} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px dashed #D1D1D6', background: 'none', color: '#8E8E93', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
      </div>

      <div className="card" style={{ padding: '24px 20px', background: 'linear-gradient(135deg, #FF2D55, #FF6482, #FF8FA3)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.05em' }}>ABHYASA100</p>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', marginTop: 4 }}>Week {weekNum} <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>of 100</span></h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Day {dayNum} · {fmtD(startDate)} → {fmtD(addDays(startDate, 699))}</p>
        <div className="progress-track" style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)' }}><div className="progress-fill" style={{ width: `${Math.min(100, weekNum)}%`, background: '#fff' }} /></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{dayData.length} days logged</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Avg {avg}/10</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div className="stat" style={{ textAlign: 'center' }}><p style={{ fontSize: 28, fontWeight: 700, color: '#FF9500' }}>🔥 {streak}</p><p style={{ fontSize: 10, fontWeight: 600, color: '#AEAEB2', marginTop: 2 }}>Day Streak</p></div>
        <div className="stat" style={{ textAlign: 'center' }}><p style={{ fontSize: 28, fontWeight: 700, color: '#34C759' }}>⭐ {perfect}</p><p style={{ fontSize: 10, fontWeight: 600, color: '#AEAEB2', marginTop: 2 }}>Perfect 10s</p></div>
        <div className="stat" style={{ textAlign: 'center' }}><p style={{ fontSize: 28, fontWeight: 700, color: '#FF2D55' }}>{avg}</p><p style={{ fontSize: 10, fontWeight: 600, color: '#AEAEB2', marginTop: 2 }}>Avg Score</p></div>
      </div>

      <div className="card" style={{ padding: '16px 20px', background: 'rgba(88,86,214,0.06)', borderLeft: '3px solid #5856D6' }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#5856D6', letterSpacing: '0.06em', marginBottom: 6 }}>TODAY&apos;S SUTRA · {ts.r}</p>
        <p style={{ fontSize: 14, fontStyle: 'italic', color: '#333', lineHeight: 1.6 }}>&ldquo;{ts.t}&rdquo;</p>
      </div>

      {lw && (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Weight Journey → 67kg</p>
          <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
            {ZONES.map(z => { const inZ = lw !== null && lw <= z.f && lw > z.t; const clr = lw !== null && lw <= z.t; return (
              <div key={z.z} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 8, borderRadius: 4, background: clr ? z.c : inZ ? z.c : '#F2F2F7', opacity: clr ? 1 : inZ ? 0.7 : 0.3 }} />
                <p style={{ fontSize: 8, fontWeight: 700, color: inZ ? z.c : '#C7C7CC', marginTop: 4 }}>{z.f}-{z.t}</p>
              </div>
            )})}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><span style={{ fontSize: 11, color: '#8E8E93' }}>Now: </span><span style={{ fontSize: 15, fontWeight: 700, color: cz?.c || '#8E8E93' }}>{lw}kg</span>{cz && <span style={{ fontSize: 11, color: cz.c, marginLeft: 6 }}>{cz.l}</span>}</div>
            <span style={{ fontSize: 11, color: '#8E8E93' }}>{wpct}% to goal</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[{ l: 'START', v: sw||'—', c: '#8E8E93' }, { l: 'NOW', v: lw||'—', c: '#FF2D55' }, { l: 'LOST', v: sw&&lw ? (sw-lw).toFixed(1) : '—', c: '#34C759' }].map(s => (
          <div key={s.l} className="stat"><p style={{ fontSize: 9, fontWeight: 600, color: '#AEAEB2', letterSpacing: '0.06em' }}>{s.l}</p><p style={{ fontSize: 24, fontWeight: 700, color: s.c, marginTop: 2 }}>{s.v}<span style={{ fontSize: 12, color: '#C7C7CC' }}>kg</span></p></div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[{ n: gD, bg: '#34C759', l: 'Green' }, { n: aD, bg: '#FF9500', l: 'Amber' }, { n: rD, bg: '#FF3B30', l: 'Red' }].map(x => (
          <div key={x.l} style={{ background: x.bg, borderRadius: 12, padding: '14px 8px', textAlign: 'center', color: '#fff' }}><p style={{ fontSize: 24, fontWeight: 700 }}>{x.n}</p><p style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>{x.l} days</p></div>
        ))}
      </div>

      {wd.length > 1 && (
        <div className="card graph-card"><h3>Weight Journey</h3>
          <ResponsiveContainer width="100%" height={160}><LineChart data={wd}><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis domain={['auto','auto']} tick={{ fontSize: 10 }} width={35} /><Tooltip /><ReferenceLine y={67} stroke="#5856D6" strokeDasharray="3 3" /><Line type="monotone" dataKey="weight" stroke="#FF2D55" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
        </div>
      )}

      {cwk.length > 0 && (
        <div className="card" style={{ padding: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Week {weekNum} Summary</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            <div style={{ background: '#F2F2F7', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: twAvg*10 > 80 ? '#34C759' : twAvg*10 >= 40 ? '#FF9500' : '#FF3B30' }}>{twAvg}</p>
              <p style={{ fontSize: 10, color: '#8E8E93' }}>This week</p>
            </div>
            <div style={{ background: '#F2F2F7', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#8E8E93' }}>{lwAvg || '—'}</p>
              <p style={{ fontSize: 10, color: '#8E8E93' }}>Last week</p>
              {lwAvg > 0 && <p style={{ fontSize: 10, color: twAvg >= lwAvg ? '#34C759' : '#FF3B30', marginTop: 2 }}>{twAvg >= lwAvg ? '↑' : '↓'} {Math.abs(twAvg-lwAvg).toFixed(1)}</p>}
            </div>
          </div>
          {best && worst && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}><span style={{ color: '#34C759' }}>Best: Day {best.day} ({best.score}/10)</span><span style={{ color: '#FF3B30' }}>Worst: Day {worst.day} ({worst.score}/10)</span></div>}
        </div>
      )}

      {wkData.length > 0 && (
        <div className="card" style={{ padding: 14 }}><p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Weekly Scores</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {wkData.map(w => (<div key={w.week} style={{ background: CM[w.color], borderRadius: 10, padding: '10px 12px', textAlign: 'center', minWidth: 56 }}><p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>WEEK {w.week}</p><p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>{w.score}</p><p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{w.days}d</p></div>))}
          </div>
        </div>
      )}

      {habits.length > 0 && (
        <div className="card" style={{ padding: 14, overflowX: 'auto' }}><p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Last 7 Days</p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ textAlign: 'left', padding: '4px 6px', color: '#AEAEB2', fontWeight: 600, fontSize: 9 }}></th>
              {rec.map(d => (<th key={d} style={{ textAlign: 'center', padding: '4px 2px', color: d === dayNum ? '#FF2D55' : '#AEAEB2', fontWeight: 700, fontSize: 10 }}>D{d}</th>))}</tr></thead>
            <tbody>
              <tr style={{ borderBottom: '2px solid rgba(60,60,67,0.08)' }}><td style={{ padding: '6px 6px', fontWeight: 700, fontSize: 11, color: '#FF2D55' }}>Score</td>
                {rec.map(d => { const dd = dayData.find(l => l.day === d); return (<td key={d} style={{ textAlign: 'center', padding: '4px 2px' }}><div style={{ background: dd ? (CM[dd.color]||'#E5E5EA') : '#F2F2F7', borderRadius: 6, padding: '4px 0', color: dd ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 12 }}>{dd?.score||'—'}</div></td>) })}</tr>
              {HL.map(hr => (<tr key={hr.k}><td style={{ padding: '4px 6px', fontSize: 10, color: '#555', fontWeight: 500 }}>{hr.l}</td>
                {rec.map(d => { const h = habits.find(x => x.day === d); const done = h ? hr.c(h) : null; return (<td key={d} style={{ textAlign: 'center', padding: '2px 2px' }}><div style={{ width: 22, height: 22, borderRadius: 6, margin: '0 auto', background: done === true ? '#34C759' : done === false ? '#FF3B30' : '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>{done === true ? '✓' : done === false ? '✗' : ''}</div></td>) })}</tr>))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 14 }}><p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Calendar</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {['M','T','W','T','F','S','S'].map((d,i) => (<div key={i} style={{ textAlign: 'center', color: '#AEAEB2', fontWeight: 700, padding: 2, fontSize: 9 }}>{d}</div>))}
          {Array.from({ length: Math.min(dayNum, 49) }, (_,i) => i+1).map(d => { const dd = dayData.find(l => l.day === d); return <div key={d} style={{ background: dd ? (CM[dd.color]||'#F2F2F7') : '#F2F2F7', borderRadius: 5, padding: '5px 0', textAlign: 'center', color: dd ? '#fff' : '#D1D1D6', fontWeight: 700, fontSize: 9 }}>{d}</div> })}
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}><p style={{ fontSize: 15, fontWeight: 600, padding: '12px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)' }}>Recent</p>
        {dayData.length === 0 ? <p style={{ padding: 24, textAlign: 'center', color: '#8E8E93' }}>No entries yet</p> :
          [...dayData].reverse().slice(0, 10).map(l => (
            <div key={l.id} className="log-row"><div><span style={{ fontSize: 15, fontWeight: 600 }}>Day {l.day}</span><span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>{fmtShort(addDays(startDate, l.day-1))}</span>{l.weight > 0 && <span style={{ fontSize: 12, color: '#AEAEB2', marginLeft: 6 }}>{l.weight}kg</span>}</div>
              <span className="badge" style={{ background: CM[l.color]||'#E5E5EA', fontSize: 12, padding: '3px 10px' }}>{l.score}/10</span></div>
          ))}
      </div>
    </div>
  )
}
