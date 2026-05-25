'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const getStartDate = async () => {
  const { data } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
  return { startDate: data?.[0]?.start_date || new Date().toISOString().split('T')[0], attemptId: data?.[0]?.attempt_number || 1 }
}

function dayDate(start: string, d: number): string { const x = new Date(start + 'T00:00:00'); x.setDate(x.getDate() + d - 1); return x.toISOString().split('T')[0] }
function fmtDate(d: string): string { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) }

const DF: any = { day:'', date:'', weight:'', omad:false, full_fast_day:false, meal_description:'',
  steps:'', fast_post_4pm:false, meditate:false, meditate_mins:'', meditate_start:'', meditate_end:'',
  sleep_hours:'', sleep_time:'', wake_time:'', zero_content:false, manifest:false,
  water_liters:'', yoga_sutras:false, zero_inbox:false, workout:false, workout_type:'', notes:'',
  protein_pct:'', fat_pct:'', carbs_pct:'' }

export default function AddPage() {
  const [form, setForm] = useState<any>({ ...DF })
  const [attemptId, setAttemptId] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [existingDays, setExistingDays] = useState<number[]>([])
  const [dayColors, setDayColors] = useState<Record<number, string>>({})
  const [photos, setPhotos] = useState<Record<string, File | null>>({ scale: null, food: null })
  const [previews, setPreviews] = useState<Record<string, string>>({ scale: '', food: '' })
  const [existing, setExisting] = useState<Record<string, string>>({ scale: '', food: '' })
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({})
  const [whoopOk, setWhoopOk] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncFields, setSyncFields] = useState<string[]>([])
  const [todayDayNum, setTodayDayNum] = useState(1)

  // Calculate today's day number in IST
  function getTodayIST(): string {
    const now = new Date()
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    return ist.toISOString().split('T')[0]
  }

  function calcDayNum(sd: string): number {
    const today = getTodayIST()
    return Math.max(1, Math.min(100, Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(sd + 'T00:00:00').getTime()) / 864e5) + 1))
  }

  // Init
  useEffect(() => {
    (async () => {
      const { startDate: sd, attemptId: aid } = await getStartDate()
      setStartDate(sd); setAttemptId(aid)
      const dayNum = calcDayNum(sd)
      setTodayDayNum(dayNum)
      setForm((p: any) => ({ ...p, day: String(dayNum), date: dayDate(sd, dayNum) }))
      loadDay(dayNum, aid, sd)
      const { data: dl } = await supabase.from('daily_logs').select('day, color').eq('attempt_id', aid).order('day')
      if (dl) {
        setExistingDays(dl.map(d => d.day))
        const colors: Record<number, string> = {}
        dl.forEach(d => { colors[d.day] = d.color || '' })
        setDayColors(colors)
      }
      fetch('/api/whoop/sync?date=2026-01-01').then(r => r.json()).then(d => setWhoopOk(d.connected !== false)).catch(() => setWhoopOk(false))
      setLoading(false)
    })()
  }, [])

  const loadPhotos = async (d: number, aid: number) => {
    const { data } = await supabase.from('photos').select('*').eq('day', d).eq('attempt_id', aid)
    const ep: Record<string, string> = { scale: '', food: '' }
    if (data) data.forEach((p: any) => {
      if (ep.hasOwnProperty(p.type)) ep[p.type] = p.photo_url + '?t=' + Date.now()
    })
    setExisting(ep)
    // Mark existing photos as saved
    if (ep.scale) setSavedItems(p => ({ ...p, 'photo-scale': true }))
    if (ep.food) setSavedItems(p => ({ ...p, 'photo-food': true }))
  }

  const loadDay = async (d: number, aid?: number, sd?: string) => {
    const a = aid || attemptId; const s = sd || startDate
    if (!d || d < 1 || d > 100) return
    const { data: h } = await supabase.from('habits').select('*').eq('day', d).eq('attempt_id', a).single()
    const { data: l } = await supabase.from('daily_logs').select('*').eq('day', d).eq('attempt_id', a).single()
    if (h || l) {
      setForm({ day: String(d), date: dayDate(s, d), weight: l?.weight ? String(l.weight) : '',
        omad: h?.omad ?? false, full_fast_day: h?.full_fast_day ?? false, meal_description: h?.meal_description || '',
        steps: h?.steps ? String(h.steps) : '', fast_post_4pm: h?.fast_post_4pm ?? false,
        meditate: h?.meditate ?? false, meditate_mins: h?.meditate_mins ? String(h.meditate_mins) : '',
        meditate_start: h?.meditate_start || '', meditate_end: h?.meditate_end || '',
        sleep_hours: h?.sleep_hours ? String(h.sleep_hours) : '', sleep_time: h?.sleep_time || '', wake_time: h?.wake_time || '',
        zero_content: h?.zero_content ?? false, manifest: h?.manifest ?? false,
        water_liters: h?.water_liters ? String(h.water_liters) : '', yoga_sutras: h?.yoga_sutras ?? false,
        zero_inbox: h?.zero_inbox ?? false, workout: h?.workout ?? false, workout_type: h?.workout_type || '',
        notes: l?.notes || '', protein_pct: h?.protein_pct ? String(h.protein_pct) : '',
        fat_pct: h?.fat_pct ? String(h.fat_pct) : '', carbs_pct: h?.carbs_pct ? String(h.carbs_pct) : '' })
    } else {
      setForm({ ...DF, day: String(d), date: dayDate(s, d) })
    }
    await loadPhotos(d, a)
    setPhotos({ scale: null, food: null }); setPreviews({ scale: '', food: '' })
    // Mark items that already have data as saved
    const alreadySaved: Record<string, boolean> = {}
    if (l?.weight) alreadySaved.weight = true
    if (h?.omad || h?.full_fast_day) alreadySaved.omad = true
    if (h?.steps) alreadySaved.steps = true
    if (h?.fast_post_4pm) alreadySaved.fast4pm = true
    if (h?.meditate) alreadySaved.meditate = true
    if (h?.sleep_hours) alreadySaved.sleep = true
    if (h?.zero_content) alreadySaved.zc = true
    if (h?.manifest) alreadySaved.manifest = true
    if (h?.water_liters) alreadySaved.water = true
    if (h?.workout) alreadySaved.workout = true
    if (h?.zero_inbox) alreadySaved.inbox = true
    if (h?.yoga_sutras) alreadySaved.sutras = true
    if (l?.notes) alreadySaved.notes = true
    setSavedItems(alreadySaved)
  }

  // Map form fields to their save item keys
  const fieldToSaveKey: Record<string, string> = {
    weight: 'weight', omad: 'omad', full_fast_day: 'omad', meal_description: 'omad',
    steps: 'steps', fast_post_4pm: 'fast4pm',
    meditate: 'meditate', meditate_mins: 'meditate', meditate_start: 'meditate', meditate_end: 'meditate',
    sleep_hours: 'sleep', sleep_time: 'sleep', wake_time: 'sleep',
    zero_content: 'zc', manifest: 'manifest', water_liters: 'water',
    workout: 'workout', workout_type: 'workout', zero_inbox: 'inbox', yoga_sutras: 'sutras',
    notes: 'notes'
  }

  const f = (k: string, v: any) => {
    setForm((p: any) => ({ ...p, [k]: v }))
    // Clear saved state so Save button reappears for editing
    const saveKey = fieldToSaveKey[k]
    if (saveKey && savedItems[saveKey]) {
      setSavedItems(p => ({ ...p, [saveKey]: false }))
    }
  }
  const goDay = (v: string) => { f('day', v); const n = parseInt(v); if (n >= 1 && n <= 100) { f('date', dayDate(startDate, n)); loadDay(n) } }

  // Save individual item
  const saveItem = async (fields: Record<string, any>, itemKey: string) => {
    if (!form.day) return; const d = +form.day
    // Check if daily_log exists
    const { data: existingLog } = await supabase.from('daily_logs').select('*').eq('day', d).eq('attempt_id', attemptId).single()
    if (!existingLog) {
      // Create minimal daily_log only if it doesn't exist — never overwrite
      await supabase.from('daily_logs').insert({ day: d, date: form.date, attempt_id: attemptId, weight: 0, notes: '' })
    }
    // Upsert habits — this NEVER touches daily_logs weight or notes
    const habitData: any = { day: d, attempt_id: attemptId, ...fields }
    await supabase.from('habits').upsert(habitData, { onConflict: 'day,attempt_id' } as any)
    // Recalc color
    const { data: h } = await supabase.from('habits').select('*').eq('day', d).eq('attempt_id', attemptId).single()
    if (h) {
      const mustHaves = [h.omad || h.full_fast_day, (h.steps || 0) >= 10000, h.fast_post_4pm]
      const missedMust = mustHaves.filter((v: boolean) => !v).length
      const bonus = [h.meditate, (h.sleep_hours || 0) >= 6, h.zero_content, h.manifest, (h.water_liters || 0) >= 3, h.workout, h.zero_inbox, h.yoga_sutras]
      const bonusDone = bonus.filter(Boolean).length
      let color = 'Missed', score = 0
      if (missedMust === 0 && bonusDone === 8) { color = 'Perfect'; score = 11 }
      else if (missedMust === 0) { color = 'Solid'; score = 3 + bonusDone }
      else if (missedMust >= 2) { color = 'Slipped'; score = Math.max(0, 3 - missedMust) + bonusDone }
      else { color = 'Solid'; score = 2 + bonusDone }
      await supabase.from('daily_logs').update({ color, score }).eq('day', d).eq('attempt_id', attemptId)
    }
    setSavedItems(p => ({ ...p, [itemKey]: true }))
    // Update existing days list
    const { data: dl } = await supabase.from('daily_logs').select('day').eq('attempt_id', attemptId).order('day')
    if (dl) setExistingDays(dl.map(d => d.day))
  }

  const saveWeight = async () => {
    if (!form.day) return; const d = +form.day
    const { data: existingLog } = await supabase.from('daily_logs').select('*').eq('day', d).eq('attempt_id', attemptId).single()
    if (existingLog) {
      await supabase.from('daily_logs').update({ weight: +form.weight || 0 }).eq('day', d).eq('attempt_id', attemptId)
    } else {
      await supabase.from('daily_logs').insert({ day: d, date: form.date, attempt_id: attemptId, weight: +form.weight || 0, notes: '' })
    }
    setSavedItems(p => ({ ...p, weight: true }))
  }

  const savePhoto = async (type: string) => {
    const file = photos[type]; if (!file || !form.day) return; const d = +form.day
    const ext = file.name.split('.').pop() || 'jpg'
    const fp = `attempt-${attemptId}/day-${d}/${type}.${ext}`
    await supabase.storage.from('photos').upload(fp, file, { upsert: true })
    const { data: u } = supabase.storage.from('photos').getPublicUrl(fp)
    // Only create daily_log if it doesn't exist — never overwrite weight or notes
    const { data: existingLog } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId).single()
    if (!existingLog) {
      await supabase.from('daily_logs').insert({ day: d, date: form.date, attempt_id: attemptId, weight: 0, notes: '' })
    }
    const { data: ex } = await supabase.from('photos').select('id').eq('day', d).eq('type', type).eq('attempt_id', attemptId).single()
    if (ex) await supabase.from('photos').update({ photo_url: u.publicUrl }).eq('id', ex.id)
    else await supabase.from('photos').insert({ day: d, date: form.date, type, photo_url: u.publicUrl, caption: type, attempt_id: attemptId })
    await loadPhotos(d, attemptId)
    setPhotos(p => ({ ...p, [type]: null })); setPreviews(p => ({ ...p, [type]: '' }))
    setSavedItems(p => ({ ...p, [`photo-${type}`]: true }))
  }

  const pickPhoto = (type: string, file: File | null) => {
    setPhotos(p => ({ ...p, [type]: file }))
    setPreviews(p => ({ ...p, [type]: file ? URL.createObjectURL(file) : '' }))
  }

  const syncWhoop = async () => {
    if (!form.date) return; setSyncing(true); setSyncFields([])
    try {
      const d = await (await fetch(`/api/whoop/sync?date=${form.date}`)).json()
      if (!d.connected) { setWhoopOk(false); setSyncing(false); return }
      const fl: string[] = []
      if (d.sleep) {
        if (d.sleep.sleep_hours) { f('sleep_hours', String(d.sleep.sleep_hours)); fl.push('Sleep') }
        if (d.sleep.sleep_time) { f('sleep_time', d.sleep.sleep_time); fl.push('Bedtime') }
        if (d.sleep.wake_time) { f('wake_time', d.sleep.wake_time); fl.push('Wake') }
      }
      if (d.steps != null) { f('steps', String(d.steps)); fl.push('Steps') }
      if (d.meditation) { f('meditate', true); fl.push('Meditation'); if (d.meditation.meditate_mins) f('meditate_mins', String(d.meditation.meditate_mins)) }
      if (d.workout) { f('workout', true); fl.push('Workout'); if (d.workout.workout_type) f('workout_type', d.workout.workout_type) }
      setSyncFields(fl)
    } catch (e) { console.error(e) }
    setSyncing(false)
  }

  const Toggle = ({ k, green, onChange }: { k: string, green?: boolean, onChange?: () => void }) => (
    <button className={`tg ${form[k] ? 'on' : 'off'} ${green ? 'tg-green' : ''}`}
      onClick={() => { f(k, !form[k]); if (onChange) setTimeout(onChange, 100) }}><div className="k" /></button>
  )

  const ItemSave = ({ itemKey, onSave }: { itemKey: string, onSave: () => void }) => (
    savedItems[itemKey] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={onSave}>Save</button>
  )

  const QUOTES = [
    '"Abhyasa — constant inner practice. Return again and again." — Patanjali 1.12',
    '"The mind becomes still through practice and desirelessness." — Patanjali 1.12',
    '"Success is nearest to those whose efforts are intense and sincere." — Patanjali 1.21',
    '"When you are inspired by a great purpose, dormant forces come alive." — Patanjali',
    '"Yoga is the cessation of the movements of the mind. Then the seer abides in its own nature." — 1.2-1.3',
    '"Do what you have to do. The results are not your concern." — Yoga Sutras',
    '"The obstacles are disease, dullness, doubt, carelessness, and laziness." — Patanjali 1.30',
    '"By cultivating friendliness, compassion, joy, and equanimity, the mind becomes purified." — 1.33',
    '"Practice becomes firmly established when continued for a long time, without break, and with devotion." — 1.14',
    '"Desirelessness is the conscious mastery of one who is free from craving." — 1.15',
  ]

  // Calculate daily completion % from actual data, not savedItems
  const completedCount = [
    form.omad || form.full_fast_day,
    +form.steps >= 10000,
    form.fast_post_4pm,
    form.meditate,
    +form.sleep_hours >= 6,
    form.zero_content,
    form.manifest,
    +form.water_liters >= 3,
    form.workout,
    form.zero_inbox,
    form.yoga_sutras
  ].filter(Boolean).length
  const dailyPct = Math.round((completedCount / 11) * 100)
  const todayQuote = QUOTES[Math.floor(new Date().getDate() % QUOTES.length)]

  if (loading) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading...</p>

  const pk = 'rgba(255,45,85,0.12)'
  const gk = 'rgba(52,199,89,0.12)'
  const pp = 'rgba(88,86,214,0.12)'
  const ok = 'rgba(255,149,0,0.12)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Add</h1>

      {/* Daily Progress Card */}
      <div className="card" style={{ padding: '20px 16px', background: dailyPct === 100 ? 'linear-gradient(135deg, #248A3D, #34C759)' : dailyPct >= 50 ? 'linear-gradient(135deg, #FF2D55, #FF6482)' : '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Progress Ring */}
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke={dailyPct >= 50 ? 'rgba(255,255,255,0.2)' : '#F2F2F7'} strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none" stroke={dailyPct === 100 ? '#fff' : dailyPct >= 50 ? '#fff' : '#FF2D55'} strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`} strokeDashoffset={`${2 * Math.PI * 28 * (1 - dailyPct / 100)}`}
                strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: dailyPct >= 50 ? '#fff' : '#FF2D55' }}>{dailyPct}%</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: dailyPct >= 50 ? '#fff' : '#000' }}>
              {dailyPct === 100 ? '🔥 Perfect Day!' : dailyPct >= 75 ? '💪 Almost there!' : dailyPct >= 50 ? '🏃 Keep going!' : dailyPct > 0 ? '🌅 Day started' : '☀️ New day, new chance'}
            </p>
            <p style={{ fontSize: 12, color: dailyPct >= 50 ? 'rgba(255,255,255,0.7)' : '#8E8E93', marginTop: 4 }}>
              {completedCount}/11 habits logged
            </p>
            <p style={{ fontSize: 11, fontStyle: 'italic', color: dailyPct >= 50 ? 'rgba(255,255,255,0.6)' : '#AEAEB2', marginTop: 6, lineHeight: 1.4 }}>
              {todayQuote}
            </p>
          </div>
        </div>
      </div>

      {/* Whoop */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="row-icon" style={{ background: pk, fontSize: 16 }}>⌚</div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500 }}>WHOOP</p>
              <p style={{ fontSize: 11, color: '#8E8E93' }}>{syncFields.length > 0 ? `✓ ${syncFields.join(' · ')}` : 'Auto-fill from your band'}</p>
            </div>
          </div>
          {whoopOk === false ? (
            <a href="/api/whoop/login" className="sync-btn" style={{ textDecoration: 'none' }}>Connect</a>
          ) : (
            <button onClick={syncWhoop} disabled={syncing} className="sync-btn">{syncing ? '...' : 'Sync'}</button>
          )}
        </div>
      </div>

      {/* Day Selector */}
      <div className="card">
        <div className="day-sel">
          <button className="day-btn" onClick={() => goDay(String(Math.max(1, (+form.day || 1) - 1)))}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <input type="number" inputMode="numeric" value={form.day} onChange={e => goDay(e.target.value)}
              style={{ width: 80, textAlign: 'center', fontSize: 22, fontWeight: 700, border: 'none', background: 'transparent', fontFamily: 'inherit', color: '#000', outline: 'none', padding: 0 }} min={1} max={100} />
            <p style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>{form.date ? fmtDate(form.date) : ''}</p>
          </div>
          <button className="day-btn" onClick={() => goDay(String(Math.min(100, (+form.day || 0) + 1)))}>›</button>
        </div>
        {todayDayNum > 0 && (
          <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 4, borderTop: '0.5px solid rgba(60,60,67,0.12)', paddingTop: 10 }}>
            {Array.from({ length: todayDayNum }, (_, i) => i + 1).map(d => {
              const hasData = existingDays.includes(d)
              const isSelected = +form.day === d
              const isToday = d === todayDayNum
              const color = dayColors[d]
              const colorMap: Record<string, string> = { 'Perfect': '#248A3D', 'Solid': '#34C759', 'Slipped': '#FF9500', 'Missed': '#FF3B30' }
              const bg = isSelected ? '#FF2D55' : color ? (colorMap[color] || '#34C759') : '#F2F2F7'
              const txt = isSelected ? '#fff' : hasData ? '#fff' : '#C7C7CC'
              return (
                <button key={d} onClick={() => goDay(String(d))} style={{
                  padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: isToday && !isSelected ? '1.5px solid #FF2D55' : 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: bg, color: txt,
                }}>{d}</button>
              )
            })}
          </div>
        )}
      </div>

      {/* Weight */}
      <p className="gh">Basics</p>
      <div className="card">
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="row-icon" style={{ background: ok }}>⚖️</div>
              <span className="row-label">Weight (kg)</span>
            </div>
            <ItemSave itemKey="weight" onSave={saveWeight} />
          </div>
          <input className="field-input" type="number" inputMode="decimal" step="0.01" value={form.weight}
            onChange={e => f('weight', e.target.value)} placeholder="Enter weight in kg" />
        </div>
      </div>

      {/* Photos */}
      <p className="gh">Photos</p>
      <div className="card">
        <div className="photo-grid">
          {[{ k: 'scale', l: 'Scale', i: '⚖️', empty: 'No weight photo' }, { k: 'food', l: 'Meal', i: '🍽️', empty: 'No meal photo' }].map(({ k, l, i, empty }) => (
            <div key={k}>
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div className="photo-box" style={{ border: previews[k] ? '2px solid #34C759' : existing[k] ? '2px solid #34C75966' : '1.5px dashed #D1D1D6' }}>
                  {(previews[k] || existing[k]) ? (
                    <img src={previews[k] || existing[k]} alt={l} />
                  ) : (
                    <><span style={{ fontSize: 24 }}>{i}</span><span style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>{empty}</span></>
                  )}
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => pickPhoto(k, e.target.files?.[0] || null)} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                {(previews[k] || photos[k]) && <ItemSave itemKey={`photo-${k}`} onSave={() => savePhoto(k)} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Must Haves */}
      <p className="gh">Must Have&apos;s</p>
      <div className="card">
        <div className="row">
          <div className="row-icon" style={{ background: pk }}>🍽️</div>
          <div className="row-body">
            <span className="row-label">OMAD</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ItemSave itemKey="omad" onSave={() => saveItem({ omad: form.omad, full_fast_day: form.full_fast_day, meal_description: form.meal_description }, 'omad')} />
              <Toggle k="omad" />
            </div>
          </div>
        </div>
        {form.omad && (
          <div style={{ padding: '0 16px 10px' }}>
            <textarea className="notes-input" rows={2} value={form.meal_description} onChange={e => f('meal_description', e.target.value)} placeholder="What did you eat?" />
          </div>
        )}
        {!form.omad && !form.full_fast_day && (
          <div style={{ padding: '0 16px 10px' }}>
            <textarea className="notes-input" rows={2} value={form.meal_description} onChange={e => f('meal_description', e.target.value)} placeholder="What did you eat today? (even without OMAD)" />
          </div>
        )}
        <div className="row">
          <div className="row-icon" style={{ background: pp }}>🚫</div>
          <div className="row-body">
            <span className="row-sub">Full fast day (no food)</span>
            <Toggle k="full_fast_day" />
          </div>
        </div>

        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="row-icon" style={{ background: pk }}>🚶</div>
              <span className="row-label">Steps</span>
            </div>
            <ItemSave itemKey="steps" onSave={() => saveItem({ steps: +form.steps }, 'steps')} />
          </div>
          <input className="field-input" type="number" inputMode="numeric" value={form.steps}
            onChange={e => f('steps', e.target.value)} placeholder="Enter step count" />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: pk }}>🕓</div>
          <div className="row-body">
            <span className="row-label">Fast post 4pm</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ItemSave itemKey="fast4pm" onSave={() => saveItem({ fast_post_4pm: form.fast_post_4pm }, 'fast4pm')} />
              <Toggle k="fast_post_4pm" />
            </div>
          </div>
        </div>
      </div>

      {/* Bonus */}
      <p className="gh">Bonus Habits</p>
      <div className="card">
        <div className="row"><div className="row-icon" style={{ background: gk }}>🧘</div><div className="row-body"><span className="row-label">Meditate</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="meditate" onSave={() => saveItem({ meditate: form.meditate, meditate_mins: +form.meditate_mins || null }, 'meditate')} /><Toggle k="meditate" green /></div></div></div>
        {form.meditate && (
          <div style={{ padding: '0 16px 10px' }}>
            <input className="field-input" type="number" inputMode="numeric" value={form.meditate_mins} onChange={e => f('meditate_mins', e.target.value)} placeholder="Duration in minutes" />
          </div>
        )}

        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}><div className="row-icon" style={{ background: gk }}>😴</div><span className="row-label">Sleep</span></div>
            <ItemSave itemKey="sleep" onSave={() => saveItem({ sleep_hours: +form.sleep_hours, sleep_time: form.sleep_time || null, wake_time: form.wake_time || null }, 'sleep')} />
          </div>
          <input className="field-input" type="number" inputMode="decimal" step="0.1" value={form.sleep_hours} onChange={e => f('sleep_hours', e.target.value)} placeholder="Hours slept" />
        </div>

        <div className="row"><div className="row-icon" style={{ background: gk }}>📵</div><div className="row-body"><span className="row-label">Zero content</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="zc" onSave={() => saveItem({ zero_content: form.zero_content }, 'zc')} /><Toggle k="zero_content" green /></div></div></div>
        <div className="row"><div className="row-icon" style={{ background: gk }}>✨</div><div className="row-body"><span className="row-label">Manifest</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="manifest" onSave={() => saveItem({ manifest: form.manifest }, 'manifest')} /><Toggle k="manifest" green /></div></div></div>

        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}><div className="row-icon" style={{ background: gk }}>💧</div><span className="row-label">Water (litres)</span></div>
            <ItemSave itemKey="water" onSave={() => saveItem({ water_liters: +form.water_liters }, 'water')} />
          </div>
          <input className="field-input" type="number" inputMode="decimal" step="0.1" value={form.water_liters} onChange={e => f('water_liters', e.target.value)} placeholder="Litres of water" />
        </div>

        <div className="row"><div className="row-icon" style={{ background: gk }}>💪</div><div className="row-body"><span className="row-label">Workout</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="workout" onSave={() => saveItem({ workout: form.workout, workout_type: form.workout_type || null }, 'workout')} /><Toggle k="workout" green /></div></div></div>
        {form.workout && (
          <div style={{ padding: '0 16px 10px' }}>
            <input className="field-input" type="text" value={form.workout_type} onChange={e => f('workout_type', e.target.value)} placeholder="e.g. Swimming, Padel, Gym" />
          </div>
        )}

        <div className="row"><div className="row-icon" style={{ background: gk }}>📬</div><div className="row-body"><span className="row-label">Zero inbox</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="inbox" onSave={() => saveItem({ zero_inbox: form.zero_inbox }, 'inbox')} /><Toggle k="zero_inbox" green /></div></div></div>
        <div className="row"><div className="row-icon" style={{ background: gk }}>📖</div><div className="row-body"><span className="row-label">Yoga Sutras</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ItemSave itemKey="sutras" onSave={() => saveItem({ yoga_sutras: form.yoga_sutras }, 'sutras')} /><Toggle k="yoga_sutras" green /></div></div></div>
      </div>

      {/* Notes */}
      <p className="gh">Notes</p>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>How are you feeling?</span>
          <ItemSave itemKey="notes" onSave={async () => {
            const d = +form.day; if (!d) return
            const { data: ex } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId).single()
            if (ex) { await supabase.from('daily_logs').update({ notes: form.notes }).eq('day', d).eq('attempt_id', attemptId) }
            else { await supabase.from('daily_logs').insert({ day: d, date: form.date, attempt_id: attemptId, notes: form.notes, weight: 0 }) }
            setSavedItems(p => ({ ...p, notes: true }))
          }} />
        </div>
        <textarea className="notes-input" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Write something..." />
      </div>

      {/* Mark as Missed */}
      <button onClick={async () => {
        if (!form.day) return
        const d = +form.day
        const confirmed = window.confirm(`Mark Day ${d} as Missed? This means you skipped your practice for the day.`)
        if (!confirmed) return
        const { data: ex } = await supabase.from('daily_logs').select('id').eq('day', d).eq('attempt_id', attemptId).single()
        if (ex) {
          await supabase.from('daily_logs').update({ color: 'Missed', score: 0 }).eq('day', d).eq('attempt_id', attemptId)
        } else {
          await supabase.from('daily_logs').insert({ day: d, date: form.date, attempt_id: attemptId, weight: 0, score: 0, color: 'Missed', notes: form.notes || 'Day marked as missed' })
        }
        setSavedItems(p => ({ ...p, missed: true }))
        // Refresh day colors
        const { data: dl } = await supabase.from('daily_logs').select('day, color').eq('attempt_id', attemptId).order('day')
        if (dl) {
          setExistingDays(dl.map((x: any) => x.day))
          const colors: Record<number, string> = {}
          dl.forEach((x: any) => { colors[x.day] = x.color || '' })
          setDayColors(colors)
        }
      }} style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: savedItems.missed ? '#FF3B30' : 'none',
        color: savedItems.missed ? '#fff' : '#FF3B30',
        border: savedItems.missed ? 'none' : '1.5px solid #FF3B30',
        fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        {savedItems.missed ? '✓ Day Marked as Missed' : `Mark Day ${form.day} as Missed`}
      </button>
    </div>
  )
}
