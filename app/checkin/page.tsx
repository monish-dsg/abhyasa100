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
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId)
      if (rows && rows.length > 0) {
        const { error } = await supabase.from('daily_logs').update({ score, color }).eq('id', rows[0].id)
        if (error) console.error('recalc update err:', error)
      } else {
        const { error } = await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: 0, score, color })
        if (error) console.error('recalc insert err:', error)
      }
    } catch (e) { console.error('recalcScore crash:', e) }
    setExistingDays(p => ({ ...p, [d]: color }))
  }

  const saveItem = async (key: string) => {
    const d = dayNum; const date = dayDate(startDate, d)
    try {
      const { data: logRows } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId)
      if (!logRows || logRows.length === 0) {
        await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: 0 })
      }
      const { data: habRows } = await supabase.from('habits').select('id').eq('day', d).eq('attempt_id', attemptId)
      if (habRows && habRows.length > 0) {
        const { error } = await supabase.from('habits').update({ [key]: form[key] }).eq('id', habRows[0].id)
        if (error) console.error('habit update err:', error)
      } else {
        const { error } = await supabase.from('habits').insert({ day: d, attempt_id: attemptId, [key]: form[key] })
        if (error) console.error('habit insert err:', error)
      }
      setSavedItems(p => ({ ...p, [key]: true }))
      await recalcScore()
    } catch (e) { console.error('saveItem crash:', e) }
  }

  const saveWeight = async () => {
    const d = dayNum; const date = dayDate(startDate, d)
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId)
      if (rows && rows.length > 0) {
        const { error } = await supabase.from('daily_logs').update({ weight: +form.weight || 0 }).eq('id', rows[0].id)
        if (error) console.error('weight update err:', error)
      } else {
        const { error } = await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: +form.weight || 0 })
        if (error) console.error('weight insert err:', error)
      }
      setSavedItems(p => ({ ...p, weight: true }))
      await recalcScore()
    } catch (e) { console.error('saveWeight crash:', e) }
  }

  const updateDay = async () => {
    setUpdating(true)
    const d = dayNum; const date = dayDate(startDate, d)
    const { score, color } = calcScore(form)
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id, weight').eq('day', d).eq('attempt_id', attemptId)
      const w = +form.weight || (rows?.[0]?.weight) || 0
      if (rows && rows.length > 0) {
        const { error } = await supabase.from('daily_logs').update({ score, color, weight: w }).eq('id', rows[0].id)
        if (error) console.error('updateDay log err:', error)
      } else {
        const { error } = await supabase.from('daily_logs').insert({ day: d, date, attempt_id: attemptId, weight: w, score, color })
        if (error) console.error('updateDay insert err:', error)
      }
      const { data: habRows } = await supabase.from('habits').select('id').eq('day', d).eq('attempt_id', attemptId)
      const hd = { day: d, attempt_id: attemptId, omad: form.omad, workout_10k: form.workout_10k, clean_eating: form.clean_eating, meditate: form.meditate, manifest: form.manifest, sleep_well: form.sleep_well, yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox, no_content: form.no_content, hydrated: form.hydrated }
      if (habRows && habRows.length > 0) {
        await supabase.from('habits').update(hd).eq('id', habRows[0].id)
      } else {
        await supabase.from('habits').insert(hd)
      }
      await refreshDayColors()
      setDayUpdated(true)
    } catch (e) { console.error('updateDay crash:', e) }
    setUpdating(false)
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
          {Array.from({ length: Math.min(todayDayNum, 21) }, (_, i) => Math.max(1, todayDayNum - 20) + i).filter(d => d >= 1 && d <= todayDayNum).map(d => {
            const c = existingDays[d]
            const cMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }
            return (
              <button key={d} onClick={() => goDay(d)} style={{
                padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: d === todayDayNum && d !== dayNum ? '2px solid #FF2D55' : '1px solid ' + (c ? 'transparent' : '#E5E5EA'),
                background: d === dayNum ? '#FF2D55' : c ? (cMap[c] || '#F2F2F7') : '#FFFFFF',
                color: d === dayNum ? '#fff' : c ? '#fff' : '#8E8E93',
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
