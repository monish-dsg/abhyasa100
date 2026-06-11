'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const getStartDate = async () => {
  const { data } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
  return { startDate: data?.[0]?.start_date || todayStr(), attemptId: data?.[0]?.attempt_number || 1 }
}

function todayStr(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}

function dayDate(start: string, d: number): string {
  const x = new Date(start + 'T12:00:00')
  x.setDate(x.getDate() + d - 1)
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
}

function fmtDate(d: string): string { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) }

function calcScore(h: any): { score: number, color: string } {
  const mustHaves = [h.omad || h.full_fast_day, h.physical_activity, h.ate_clean]
  const mustCount = mustHaves.filter(Boolean).length
  const bonus = [h.meditate, h.manifest, h.sleep_6hrs, h.yoga_sutras, h.zero_inbox, h.zero_content, h.water_3l]
  const bonusCount = bonus.filter(Boolean).length
  const score = Math.round(((mustCount / 3) * 7 + (bonusCount / 7) * 3) * 10) / 10
  const pct = score * 10
  const color = pct > 80 ? 'Green' : pct >= 40 ? 'Amber' : 'Red'
  return { score, color }
}

const HABITS_MUST = [
  { key: 'omad', label: 'OMAD', icon: '🍽️', sub: 'One meal a day' },
  { key: 'full_fast_day', label: 'Full Fast', icon: '🚫', sub: 'No food today' },
  { key: 'physical_activity', label: 'Physical Activity', icon: '🏃', sub: '10,000 steps or workout' },
  { key: 'ate_clean', label: 'Ate Clean', icon: '🥗', sub: 'No fried, processed, canned drinks, wheat, bread, sugar' },
]

const HABITS_BONUS = [
  { key: 'meditate', label: 'Meditate', icon: '🧘' },
  { key: 'manifest', label: 'Manifest', icon: '✨' },
  { key: 'sleep_6hrs', label: 'Sleep 6+ Hours', icon: '😴' },
  { key: 'yoga_sutras', label: 'Yoga Sutras', icon: '📖' },
  { key: 'zero_inbox', label: 'Zero Inbox', icon: '📬' },
  { key: 'zero_content', label: 'Zero Content', icon: '📵' },
  { key: 'water_3l', label: 'Water 3L', icon: '💧' },
]

const DF: Record<string, any> = {
  omad: false, full_fast_day: false, physical_activity: false, ate_clean: false,
  meditate: false, manifest: false, sleep_6hrs: false, yoga_sutras: false,
  zero_inbox: false, zero_content: false, water_3l: false, weight: '',
}

export default function AddPage() {
  const [form, setForm] = useState<Record<string, any>>({ ...DF })
  const [attemptId, setAttemptId] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [dayNum, setDayNum] = useState(1)
  const [todayDayNum, setTodayDayNum] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [existingDays, setExistingDays] = useState<Record<number, string>>({})

  useEffect(() => {
    (async () => {
      const { startDate: sd, attemptId: aid } = await getStartDate()
      setStartDate(sd); setAttemptId(aid)
      const today = todayStr()
      const dn = Math.max(1, Math.min(700, Math.floor((new Date(today + 'T12:00:00').getTime() - new Date(sd + 'T12:00:00').getTime()) / 864e5) + 1))
      setTodayDayNum(dn); setDayNum(dn)
      await loadDay(dn, aid, sd)
      const { data: dl } = await supabase.from('daily_logs').select('day, color').eq('attempt_id', aid).order('day')
      if (dl) {
        const dc: Record<number, string> = {}
        dl.forEach(d => { dc[d.day] = d.color || '' })
        setExistingDays(dc)
      }
      setLoading(false)
    })()
  }, [])

  const loadDay = async (d: number, aid?: number, sd?: string) => {
    const a = aid || attemptId
    if (!d || d < 1 || d > 700) return
    const { data: h } = await supabase.from('habits').select('*').eq('day', d).eq('attempt_id', a).single()
    const { data: l } = await supabase.from('daily_logs').select('*').eq('day', d).eq('attempt_id', a).single()
    if (h) {
      setForm({
        omad: h.omad ?? false, full_fast_day: h.full_fast_day ?? false,
        physical_activity: h.physical_activity ?? false, ate_clean: h.fast_post_4pm ?? h.ate_clean ?? false,
        meditate: h.meditate ?? false, manifest: h.manifest ?? false,
        sleep_6hrs: h.sleep_6hrs ?? (h.sleep_hours ? h.sleep_hours >= 6 : false),
        yoga_sutras: h.yoga_sutras ?? false, zero_inbox: h.zero_inbox ?? false,
        zero_content: h.zero_content ?? false, water_3l: h.water_3l ?? (h.water_liters ? h.water_liters >= 3 : false),
        weight: l?.weight ? String(l.weight) : '',
      })
    } else {
      setForm({ ...DF, weight: l?.weight ? String(l.weight) : '' })
    }
    setSaved(false)
  }

  const goDay = (d: number) => {
    if (d < 1 || d > 700) return
    setDayNum(d); loadDay(d)
  }

  const saveDay = async () => {
    setSaving(true)
    const { score, color } = calcScore(form)
    const date = dayDate(startDate, dayNum)

    // Save daily log
    const { data: existingLog } = await supabase.from('daily_logs').select('id, weight, notes').eq('day', dayNum).eq('attempt_id', attemptId).single()
    if (existingLog) {
      await supabase.from('daily_logs').update({ color, score, weight: +form.weight || existingLog.weight || 0 }).eq('day', dayNum).eq('attempt_id', attemptId)
    } else {
      await supabase.from('daily_logs').insert({ day: dayNum, date, attempt_id: attemptId, weight: +form.weight || 0, score, color })
    }

    // Save habits
    await supabase.from('habits').upsert({
      day: dayNum, attempt_id: attemptId,
      omad: form.omad, full_fast_day: form.full_fast_day,
      physical_activity: form.physical_activity, ate_clean: form.ate_clean,
      meditate: form.meditate, manifest: form.manifest, sleep_6hrs: form.sleep_6hrs,
      yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox,
      zero_content: form.zero_content, water_3l: form.water_3l,
    }, { onConflict: 'day,attempt_id' } as any)

    // Update existing days
    setExistingDays(p => ({ ...p, [dayNum]: color }))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const f = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setSaved(false) }

  const { score, color } = calcScore(form)
  const pct = score * 10
  const weekNum = Math.ceil(dayNum / 7)

  if (loading) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading...</p>

  const pk = 'rgba(255,45,85,0.12)'
  const gk = 'rgba(52,199,89,0.12)'
  const colorMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Add</h1>

      {/* Score Card */}
      <div className="card" style={{ padding: '20px 16px', background: pct > 80 ? 'linear-gradient(135deg, #248A3D, #34C759)' : pct >= 40 ? 'linear-gradient(135deg, #FF9500, #FFB340)' : pct > 0 ? 'linear-gradient(135deg, #FF3B30, #FF6961)' : '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke={pct > 0 ? 'rgba(255,255,255,0.2)' : '#F2F2F7'} strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={pct > 0 ? '#fff' : '#FF2D55'} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
                strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: pct > 0 ? '#fff' : '#FF2D55' }}>{score}</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, color: pct > 0 ? '#fff' : '#000' }}>
              {pct > 80 ? '🔥 Crushing it!' : pct >= 40 ? '💪 Keep pushing' : pct > 0 ? '🌅 Just starting' : '☀️ New day'}
            </p>
            <p style={{ fontSize: 13, color: pct > 0 ? 'rgba(255,255,255,0.7)' : '#8E8E93' }}>{score}/10 · Week {weekNum} · Day {dayNum}</p>
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="card">
        <div className="day-sel">
          <button className="day-btn" onClick={() => goDay(dayNum - 1)}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700 }}>Day {dayNum}</p>
            <p style={{ fontSize: 12, color: '#8E8E93' }}>{fmtDate(dayDate(startDate, dayNum))} · Week {weekNum}</p>
          </div>
          <button className="day-btn" onClick={() => goDay(dayNum + 1)}>›</button>
        </div>
        {/* Recent days */}
        <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '0.5px solid rgba(60,60,67,0.12)', paddingTop: 10 }}>
          {Array.from({ length: Math.min(todayDayNum, 21) }, (_, i) => todayDayNum - 20 + i).filter(d => d >= 1).map(d => {
            const c = existingDays[d]
            const cMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }
            return (
              <button key={d} onClick={() => goDay(d)} style={{
                padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                border: d === todayDayNum && d !== dayNum ? '1.5px solid #FF2D55' : 'none',
                background: d === dayNum ? '#FF2D55' : c ? (cMap[c] || '#F2F2F7') : '#F2F2F7',
                color: d === dayNum ? '#fff' : c ? '#fff' : '#C7C7CC',
              }}>{d}</button>
            )
          })}
        </div>
      </div>

      {/* Weight */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚖️</span>
          <span style={{ fontSize: 16, fontWeight: 500, flex: 1 }}>Weight</span>
          <input className="field-input" type="number" inputMode="decimal" step="0.01" value={form.weight}
            onChange={e => f('weight', e.target.value)} placeholder="kg"
            style={{ width: 100, textAlign: 'right' }} />
        </div>
      </div>

      {/* Must Haves - 70% */}
      <p className="gh">Must Have&apos;s · 70% of score</p>
      <div className="card">
        {HABITS_MUST.map(h => (
          <div key={h.key} className="row">
            <div className="row-icon" style={{ background: pk }}>{h.icon}</div>
            <div className="row-body">
              <div style={{ flex: 1 }}>
                <span className="row-label">{h.label}</span>
                {h.sub && <p style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{h.sub}</p>}
              </div>
              <button className={`tg ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}>
                <div className="k" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bonus - 30% */}
      <p className="gh">Bonus · 30% of score</p>
      <div className="card">
        {HABITS_BONUS.map(h => (
          <div key={h.key} className="row">
            <div className="row-icon" style={{ background: gk }}>{h.icon}</div>
            <div className="row-body">
              <span className="row-label">{h.label}</span>
              <button className={`tg tg-green ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}>
                <div className="k" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <button onClick={saveDay} disabled={saving} className="save-all" style={{ marginTop: 4, opacity: saving ? 0.5 : 1 }}>
        {saving ? 'Saving...' : saved ? `✓ Day ${dayNum} Saved! (${score}/10)` : `Save Day ${dayNum}`}
      </button>
    </div>
  )
}
