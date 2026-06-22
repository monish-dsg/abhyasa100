'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const getActiveAttempt = async () => {
  const { data } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
  return { startDate: data?.[0]?.start_date || todayStr(), attemptId: data?.[0]?.attempt_number || 1 }
}

function todayStr(): string {
  const now = new Date(); const ist = new Date(now.getTime() + 5.5*60*60*1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}
function dayDate(start: string, d: number): string {
  const x = new Date(start + 'T12:00:00'); x.setDate(x.getDate() + d - 1)
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
}
function fmtDate(d: string): string { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) }

function calcScore(f: any): { score: number, pct: number, color: string } {
  const must = [f.omad, f.workout_10k, f.clean_eating].filter(Boolean).length
  const bonus = [f.meditate, f.manifest, f.sleep_well, f.yoga_sutras, f.zero_inbox, f.no_content, f.hydrated].filter(Boolean).length
  const score = Math.round(((must / 3) * 7 + (bonus / 7) * 3) * 10) / 10
  const pct = score * 10
  const color = pct > 80 ? 'Green' : pct >= 40 ? 'Amber' : 'Red'
  return { score, pct, color }
}

const MUST_HAVES = [
  { key: 'omad', label: 'OMAD', icon: '🍽️' },
  { key: 'workout_10k', label: 'Workout (10k)', icon: '🏃' },
  { key: 'clean_eating', label: 'Clean Eating', icon: '🥗', sub: 'No fried, processed, canned drinks, wheat, bread, sugar' },
]
const BONUS = [
  { key: 'meditate', label: 'Meditate', icon: '🧘' },
  { key: 'manifest', label: 'Manifest', icon: '✨' },
  { key: 'sleep_well', label: 'Sleep Well (6 Hrs)', icon: '😴' },
  { key: 'yoga_sutras', label: 'YogaSutras', icon: '📖' },
  { key: 'zero_inbox', label: 'Zero Inbox', icon: '📬' },
  { key: 'no_content', label: 'No Content', icon: '📵' },
  { key: 'hydrated', label: 'Hydrated (3Ls)', icon: '💧' },
]

export default function AddPage() {
  const [form, setForm] = useState<Record<string, any>>({
    omad: false, workout_10k: false, clean_eating: false,
    meditate: false, manifest: false, sleep_well: false, yoga_sutras: false,
    zero_inbox: false, no_content: false, hydrated: false, weight: '',
  })
  const [attemptId, setAttemptId] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [dayNum, setDayNum] = useState(1)
  const [todayDayNum, setTodayDayNum] = useState(1)
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({})
  const [dayUpdated, setDayUpdated] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [existingDays, setExistingDays] = useState<Record<number, string>>({})

  useEffect(() => {
    (async () => {
      const { startDate: sd, attemptId: aid } = await getActiveAttempt()
      setStartDate(sd); setAttemptId(aid)
      const today = todayStr()
      const dn = Math.max(1, Math.min(700, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(sd + 'T12:00:00').getTime()) / 864e5) + 1))
      setTodayDayNum(dn); setDayNum(dn)
      await loadDay(dn, aid)
      await refreshDayColors(aid)
      setLoading(false)
    })()
  }, [])

  const refreshDayColors = async (aid?: number) => {
    const { data: dl } = await supabase.from('daily_logs').select('day, color').eq('attempt_id', aid || attemptId).order('day')
    if (dl) { const dc: Record<number, string> = {}; dl.forEach(d => { dc[d.day] = d.color || '' }); setExistingDays(dc) }
  }

  const loadDay = async (d: number, aid?: number) => {
    const a = aid || attemptId
    if (d < 1 || d > 700) return
    const { data: h } = await supabase.from('habits').select('*').eq('day', d).eq('attempt_id', a).single()
    const { data: l } = await supabase.from('daily_logs').select('*').eq('day', d).eq('attempt_id', a).single()
    const saved: Record<string, boolean> = {}
    if (h) {
      const f: Record<string, any> = {
        omad: h.omad ?? false, workout_10k: h.workout_10k ?? h.physical_activity ?? h.workout ?? false,
        clean_eating: h.clean_eating ?? h.ate_clean ?? h.fast_post_4pm ?? false,
        meditate: h.meditate ?? false, manifest: h.manifest ?? false,
        sleep_well: h.sleep_well ?? h.sleep_6hrs ?? false,
        yoga_sutras: h.yoga_sutras ?? false, zero_inbox: h.zero_inbox ?? false,
        no_content: h.no_content ?? h.zero_content ?? false,
        hydrated: h.hydrated ?? h.water_3l ?? false,
        weight: l?.weight ? String(l.weight) : '',
      }
      setForm(f)
      Object.keys(f).forEach(k => { if (k !== 'weight' && f[k]) saved[k] = true })
      if (l?.weight) saved.weight = true
    } else {
      setForm({ omad: false, workout_10k: false, clean_eating: false, meditate: false, manifest: false, sleep_well: false, yoga_sutras: false, zero_inbox: false, no_content: false, hydrated: false, weight: l?.weight ? String(l.weight) : '' })
      if (l?.weight) saved.weight = true
    }
    setSavedItems(saved)
    setDayUpdated(!!l?.color)
  }

  const goDay = (d: number) => { if (d >= 1 && d <= 700) { setDayNum(d); loadDay(d); setDayUpdated(false) } }

  const f = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setSavedItems(p => ({ ...p, [k]: false })); setDayUpdated(false) }

  // Recalculate and save score to daily_logs
  const recalcScore = async () => {
    const d = dayNum; const date = dayDate(startDate, d)
    const { score, color } = calcScore(form)
    const { data: ex } = await supabase.from('daily_logs').select('id, weight').eq('day', d).eq('attempt_id', attemptId).single()
    if (ex) {
      await supabase.from('daily_logs').update({ score, color }).eq('day', d).eq('attempt_id', attemptId)
    } else {
      await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: 0, score, color })
    }
    setExistingDays(p => ({ ...p, [d]: color }))
  }

  // Save individual item
  const saveItem = async (key: string) => {
    const d = dayNum; const date = dayDate(startDate, d)
    // Ensure daily_log exists
    const { data: ex } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId).single()
    if (!ex) await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: 0 })
    // Upsert habit field
    const { data: exH } = await supabase.from('habits').select('id').eq('day', d).eq('attempt_id', attemptId).single()
    if (exH) {
      await supabase.from('habits').update({ [key]: form[key] }).eq('day', d).eq('attempt_id', attemptId)
    } else {
      await supabase.from('habits').insert({ day: d, attempt_id: attemptId, [key]: form[key] })
    }
    setSavedItems(p => ({ ...p, [key]: true }))
    // Auto-update score
    await recalcScore()
  }

  const saveWeight = async () => {
    const d = dayNum; const date = dayDate(startDate, d)
    const { data: ex } = await supabase.from('daily_logs').select('id, notes').eq('day', d).eq('attempt_id', attemptId).single()
    if (ex) { await supabase.from('daily_logs').update({ weight: +form.weight || 0 }).eq('day', d).eq('attempt_id', attemptId) }
    else { await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: +form.weight || 0 }) }
    setSavedItems(p => ({ ...p, weight: true }))
    // Auto-update score
    await recalcScore()
  }

  // Update Day - calculates score and color
  const updateDay = async () => {
    setUpdating(true)
    const d = dayNum; const date = dayDate(startDate, d)
    const { score, color } = calcScore(form)
    
    // Get existing weight so we don't overwrite it
    const { data: existingLog } = await supabase.from('daily_logs').select('weight').eq('day', d).eq('attempt_id', attemptId).single()
    const w = +form.weight || existingLog?.weight || 0

    // Upsert daily_log with score and color
    const { error: logErr } = await supabase.from('daily_logs').upsert({
      day: d, date, attempt_id: attemptId, weight: w, score, color
    }, { onConflict: 'day,attempt_id' } as any)
    
    if (logErr) console.error('Log save error:', logErr)

    // Upsert all habits
    const { error: habErr } = await supabase.from('habits').upsert({
      day: d, attempt_id: attemptId,
      omad: form.omad, workout_10k: form.workout_10k, clean_eating: form.clean_eating,
      meditate: form.meditate, manifest: form.manifest, sleep_well: form.sleep_well,
      yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox,
      no_content: form.no_content, hydrated: form.hydrated,
    }, { onConflict: 'day,attempt_id' } as any)
    
    if (habErr) console.error('Habit save error:', habErr)

    await refreshDayColors()
    setDayUpdated(true); setUpdating(false)
  }

  const { score, pct, color } = calcScore(form)
  const weekNum = Math.ceil(dayNum / 7)
  const colorMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

  if (loading) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header with Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Day {dayNum}</h1>
          <p style={{ fontSize: 14, color: '#8E8E93' }}>{fmtDate(dayDate(startDate, dayNum))} · Week {weekNum}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: colorMap[color] || '#8E8E93' }}>{score}</p>
          <p style={{ fontSize: 11, color: '#8E8E93' }}>out of 10</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: colorMap[color] || '#E5E5EA', borderRadius: 4 }} />
      </div>

      {/* Day Selector */}
      <div className="card">
        <div className="day-sel">
          <button className="day-btn" onClick={() => goDay(dayNum - 1)}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Day {dayNum} of 700</p>
          </div>
          <button className="day-btn" onClick={() => goDay(dayNum + 1)}>›</button>
        </div>
        <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 3, borderTop: '0.5px solid rgba(60,60,67,0.12)', paddingTop: 8 }}>
          {Array.from({ length: Math.min(todayDayNum, 21) }, (_, i) => todayDayNum - 20 + i).filter(d => d >= 1).map(d => {
            const c = existingDays[d]
            const cMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }
            return (
              <button key={d} onClick={() => goDay(d)} style={{
                padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: d === todayDayNum && d !== dayNum ? '1.5px solid #FF2D55' : 'none',
                background: d === dayNum ? '#FF2D55' : c ? (cMap[c] || '#F2F2F7') : '#F2F2F7',
                color: d === dayNum ? '#fff' : c ? '#fff' : '#D1D1D6',
              }}>{d}</button>
            )
          })}
        </div>
      </div>

      {/* Weight */}
      <div className="card">
        <div className="row">
          <div className="row-icon" style={{ background: 'rgba(255,149,0,0.12)' }}>⚖️</div>
          <div className="row-body">
            <span className="row-label">Weight</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {savedItems.weight ? <span className="item-saved">✓</span> : <button className="item-save" onClick={saveWeight}>Save</button>}
              <input className="field-input" type="number" inputMode="decimal" step="0.01" value={form.weight}
                onChange={e => f('weight', e.target.value)} placeholder="kg" style={{ width: 80, textAlign: 'right', padding: '8px 10px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Must Haves */}
      <p className="gh">Must Have&apos;s · 70%</p>
      <div className="card">
        {MUST_HAVES.map(h => (
          <div key={h.key} className="row">
            <div className="row-icon" style={{ background: 'rgba(255,45,85,0.12)' }}>{h.icon}</div>
            <div className="row-body">
              <div style={{ flex: 1 }}>
                <span className="row-label">{h.label}</span>
                {h.sub && <p style={{ fontSize: 10, color: '#AEAEB2', marginTop: 1 }}>{h.sub}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                <button className={`tg ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}>
                  <div className="k" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bonus */}
      <p className="gh">Bonus · 30%</p>
      <div className="card">
        {BONUS.map(h => (
          <div key={h.key} className="row">
            <div className="row-icon" style={{ background: 'rgba(52,199,89,0.12)' }}>{h.icon}</div>
            <div className="row-body">
              <span className="row-label">{h.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                <button className={`tg tg-green ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}>
                  <div className="k" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Update Day Button */}
      <button onClick={updateDay} disabled={updating} className="save-all" style={{
        marginTop: 6, opacity: updating ? 0.5 : 1,
        background: dayUpdated ? colorMap[color] : 'linear-gradient(135deg, #FF2D55, #FF6482)',
      }}>
        {updating ? 'Updating...' : dayUpdated ? `✓ Day ${dayNum} Updated · ${score}/10` : `Update Day ${dayNum}`}
      </button>
    </div>
  )
}
