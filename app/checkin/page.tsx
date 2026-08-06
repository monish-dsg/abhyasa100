'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function todayStr(): string {
  const now = new Date(); const ist = new Date(now.getTime() + 5.5*60*60*1000)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth()+1).padStart(2,'0')}-${String(ist.getUTCDate()).padStart(2,'0')}`
}
function weekDate(start: string, w: number): { from: string, to: string } {
  const s = new Date(start + 'T12:00:00'); s.setDate(s.getDate() + (w - 1) * 7)
  const e = new Date(s); e.setDate(e.getDate() + 6)
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { from: fmt(s), to: fmt(e) }
}
function fmtD(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }

function calcScore(f: any): { score: number, pct: number, color: string } {
  const must = [
    (f.meals_count || 0) <= 7 && (f.meals_count || 0) > 0,
    (f.steps_total || 0) >= 70000,
    (f.workouts_count || 0) >= 5,
    f.clean_eating,
  ].filter(Boolean).length
  const bonus = [
    (f.meditate_count || 0) >= 7,
    (f.manifest_count || 0) >= 7,
    (f.sleep_total_hours || 0) >= 50,
    f.yoga_sutras,
    f.zero_inbox,
    (f.content_hours || 0) <= 10 && f.content_hours !== '' && f.content_hours !== undefined,
    f.hydrated,
  ].filter(Boolean).length
  const score = Math.round(((must / 4) * 7 + (bonus / 7) * 3) * 10) / 10
  const pct = score * 10
  const color = pct > 80 ? 'Green' : pct >= 40 ? 'Amber' : 'Red'
  return { score, pct, color }
}

const MUST = [
  { key: 'meals_count', label: 'Meals This Week', icon: '🍽️', type: 'number', target: '≤ 7 meals', placeholder: '0' },
  { key: 'steps_total', label: 'Steps This Week', icon: '🚶', type: 'number', target: '≥ 70,000 steps', placeholder: '0' },
  { key: 'workouts_count', label: 'Workouts This Week', icon: '💪', type: 'number', target: '≥ 5 workouts', placeholder: '0' },
  { key: 'clean_eating', label: 'Ate Clean', icon: '🥗', type: 'toggle', target: 'No fried, processed, wheat, sugar' },
]
const BONUS = [
  { key: 'meditate_count', label: 'Meditate', icon: '🧘', type: 'number', target: '≥ 7 times', placeholder: '0' },
  { key: 'manifest_count', label: 'Manifest', icon: '✨', type: 'number', target: '≥ 7 times', placeholder: '0' },
  { key: 'sleep_total_hours', label: 'Sleep This Week', icon: '😴', type: 'number', target: '≥ 50 hours', placeholder: '0', step: '0.5' },
  { key: 'yoga_sutras', label: 'YogaSutras', icon: '📖', type: 'toggle', target: 'Read this week' },
  { key: 'zero_inbox', label: 'Zero Inbox', icon: '📬', type: 'toggle', target: 'Cleaned inbox daily' },
  { key: 'content_hours', label: 'Content Hours', icon: '📵', type: 'number', target: '< 10 hours', placeholder: '0', step: '0.5' },
  { key: 'hydrated', label: 'Hydrated (3Ls)', icon: '💧', type: 'toggle', target: 'Drank 3L+ daily' },
]

export default function AddPage() {
  const [form, setForm] = useState<Record<string, any>>({
    meals_count: '', steps_total: '', workouts_count: '', clean_eating: false,
    meditate_count: '', manifest_count: '', sleep_total_hours: '', yoga_sutras: false,
    zero_inbox: false, content_hours: '', hydrated: false, weight: '',
  })
  const [attemptId, setAttemptId] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [weekNum, setWeekNum] = useState(1)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({})
  const [dayUpdated, setDayUpdated] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [weekColors, setWeekColors] = useState<Record<number, string>>({})
  const [photos, setPhotos] = useState<Record<string, File | null>>({ scale: null, selfie: null })
  const [previews, setPreviews] = useState<Record<string, string>>({ scale: '', selfie: '' })
  const [existing, setExisting] = useState<Record<string, string>>({ scale: '', selfie: '' })

  useEffect(() => {
    (async () => {
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1
      const sd = att?.[0]?.start_date || todayStr()
      setAttemptId(aid); setStartDate(sd)
      const today = todayStr()
      const wk = Math.max(1, Math.min(100, Math.ceil((new Date(today + 'T12:00:00').getTime() - new Date(sd + 'T12:00:00').getTime() + 864e5) / (7 * 864e5))))
      setCurrentWeek(wk); setWeekNum(wk)
      await loadWeek(wk, aid)
      await refreshWeekColors(aid)
      setLoading(false)
    })()
  }, [])

  const refreshWeekColors = async (aid?: number) => {
    const { data: dl } = await supabase.from('daily_logs').select('day, color').eq('attempt_id', aid || attemptId).order('day')
    if (dl) { const wc: Record<number, string> = {}; dl.forEach(d => { wc[d.day] = d.color || '' }); setWeekColors(wc) }
  }

  const loadPhotos = async (w: number, aid: number) => {
    const { data } = await supabase.from('photos').select('*').eq('day', w).eq('attempt_id', aid)
    const ep: Record<string, string> = { scale: '', selfie: '' }
    if (data) data.forEach((p: any) => { if (ep.hasOwnProperty(p.type)) ep[p.type] = p.photo_url + '?t=' + Date.now() })
    setExisting(ep)
  }

  const loadWeek = async (w: number, aid?: number) => {
    const a = aid || attemptId
    if (w < 1 || w > 100) return
    const { data: h } = await supabase.from('habits').select('*').eq('day', w).eq('attempt_id', a)
    const { data: l } = await supabase.from('daily_logs').select('*').eq('day', w).eq('attempt_id', a)
    const hab = h?.[0]; const log = l?.[0]
    const saved: Record<string, boolean> = {}
    if (hab) {
      setForm({
        meals_count: hab.meals_count ? String(hab.meals_count) : '',
        steps_total: hab.steps_total ? String(hab.steps_total) : '',
        workouts_count: hab.workouts_count ? String(hab.workouts_count) : '',
        clean_eating: hab.clean_eating ?? false,
        meditate_count: hab.meditate_count ? String(hab.meditate_count) : '',
        manifest_count: hab.manifest_count ? String(hab.manifest_count) : '',
        sleep_total_hours: hab.sleep_total_hours ? String(hab.sleep_total_hours) : '',
        yoga_sutras: hab.yoga_sutras ?? false,
        zero_inbox: hab.zero_inbox ?? false,
        content_hours: hab.content_hours != null ? String(hab.content_hours) : '',
        hydrated: hab.hydrated ?? false,
        weight: log?.weight ? String(log.weight) : '',
      })
      if (hab.meals_count) saved.meals_count = true
      if (hab.steps_total) saved.steps_total = true
      if (hab.workouts_count) saved.workouts_count = true
      if (hab.clean_eating) saved.clean_eating = true
      if (hab.meditate_count) saved.meditate_count = true
      if (hab.manifest_count) saved.manifest_count = true
      if (hab.sleep_total_hours) saved.sleep_total_hours = true
      if (hab.yoga_sutras) saved.yoga_sutras = true
      if (hab.zero_inbox) saved.zero_inbox = true
      if (hab.content_hours != null && hab.content_hours !== 0) saved.content_hours = true
      if (hab.hydrated) saved.hydrated = true
      if (log?.weight) saved.weight = true
    } else {
      setForm({ meals_count: '', steps_total: '', workouts_count: '', clean_eating: false, meditate_count: '', manifest_count: '', sleep_total_hours: '', yoga_sutras: false, zero_inbox: false, content_hours: '', hydrated: false, weight: log?.weight ? String(log.weight) : '' })
      if (log?.weight) saved.weight = true
    }
    setSavedItems(saved); setDayUpdated(!!log?.color && log.color !== 'Red' || !!log?.score)
    await loadPhotos(w, a)
    setPhotos({ scale: null, selfie: null }); setPreviews({ scale: '', selfie: '' })
  }

  const goWeek = (w: number) => { if (w >= 1 && w <= 100) { setWeekNum(w); loadWeek(w); setDayUpdated(false) } }
  const f = (k: string, v: any) => { setForm(p => ({ ...p, [k]: v })); setSavedItems(p => ({ ...p, [k]: false })); setDayUpdated(false) }

  const saveItem = async (key: string) => {
    const w = weekNum; const { from } = weekDate(startDate, w)
    try {
      const { data: logRows } = await supabase.from('daily_logs').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (!logRows || logRows.length === 0) await supabase.from('daily_logs').insert({ day: w, date: from, attempt_id: attemptId, weight: 0 })
      const val = typeof form[key] === 'boolean' ? form[key] : (+form[key] || 0)
      const { data: habRows } = await supabase.from('habits').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (habRows && habRows.length > 0) {
        await supabase.from('habits').update({ [key]: val }).eq('id', habRows[0].id)
      } else {
        await supabase.from('habits').insert({ day: w, attempt_id: attemptId, [key]: val })
      }
      setSavedItems(p => ({ ...p, [key]: true }))
      await recalcScore()
    } catch (e) { console.error('saveItem:', e) }
  }

  const saveWeight = async () => {
    const w = weekNum; const { from } = weekDate(startDate, w)
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (rows && rows.length > 0) {
        await supabase.from('daily_logs').update({ weight: +form.weight || 0 }).eq('id', rows[0].id)
      } else {
        await supabase.from('daily_logs').insert({ day: w, date: from, attempt_id: attemptId, weight: +form.weight || 0 })
      }
      setSavedItems(p => ({ ...p, weight: true }))
      await recalcScore()
    } catch (e) { console.error('saveWeight:', e) }
  }

  const savePhoto = async (type: string) => {
    const file = photos[type]; if (!file) return; const w = weekNum; const { from } = weekDate(startDate, w)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fp = `week-${w}/${type}.${ext}`
      await supabase.storage.from('photos').upload(fp, file, { upsert: true })
      const { data: u } = supabase.storage.from('photos').getPublicUrl(fp)
      const { data: logRows } = await supabase.from('daily_logs').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (!logRows || logRows.length === 0) await supabase.from('daily_logs').insert({ day: w, date: from, attempt_id: attemptId, weight: 0 })
      const { data: ex } = await supabase.from('photos').select('id').eq('day', w).eq('type', type).eq('attempt_id', attemptId)
      if (ex && ex.length > 0) await supabase.from('photos').update({ photo_url: u.publicUrl }).eq('id', ex[0].id)
      else await supabase.from('photos').insert({ day: w, date: from, type, photo_url: u.publicUrl, caption: type, attempt_id: attemptId })
      await loadPhotos(w, attemptId)
      setPhotos(p => ({ ...p, [type]: null })); setPreviews(p => ({ ...p, [type]: '' }))
      setSavedItems(p => ({ ...p, [`photo-${type}`]: true }))
    } catch (e) { console.error('savePhoto:', e) }
  }

  const recalcScore = async () => {
    const w = weekNum; const { from } = weekDate(startDate, w)
    const { score, color } = calcScore(form)
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (rows && rows.length > 0) {
        await supabase.from('daily_logs').update({ score, color }).eq('id', rows[0].id)
      } else {
        await supabase.from('daily_logs').insert({ day: w, date: from, attempt_id: attemptId, weight: 0, score, color })
      }
    } catch (e) { console.error('recalcScore:', e) }
    setWeekColors(p => ({ ...p, [w]: color }))
  }

  const updateWeek = async () => {
    setUpdating(true)
    const w = weekNum; const { from } = weekDate(startDate, w)
    const { score, color } = calcScore(form)
    try {
      const { data: rows } = await supabase.from('daily_logs').select('id, weight').eq('day', w).eq('attempt_id', attemptId)
      const wt = +form.weight || rows?.[0]?.weight || 0
      if (rows && rows.length > 0) {
        await supabase.from('daily_logs').update({ score, color, weight: wt }).eq('id', rows[0].id)
      } else {
        await supabase.from('daily_logs').insert({ day: w, date: from, attempt_id: attemptId, weight: wt, score, color })
      }
      const habData: any = { day: w, attempt_id: attemptId, meals_count: +form.meals_count || 0, steps_total: +form.steps_total || 0, workouts_count: +form.workouts_count || 0, clean_eating: form.clean_eating, meditate_count: +form.meditate_count || 0, manifest_count: +form.manifest_count || 0, sleep_total_hours: +form.sleep_total_hours || 0, yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox, content_hours: +form.content_hours || 0, hydrated: form.hydrated }
      const { data: habRows } = await supabase.from('habits').select('id').eq('day', w).eq('attempt_id', attemptId)
      if (habRows && habRows.length > 0) await supabase.from('habits').update(habData).eq('id', habRows[0].id)
      else await supabase.from('habits').insert(habData)
      await refreshWeekColors()
      setDayUpdated(true)
    } catch (e) { console.error('updateWeek:', e) }
    setUpdating(false)
  }

  const { score, pct, color } = calcScore(form)
  const wd = weekDate(startDate, weekNum)
  const colorMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }

  if (loading) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Week {weekNum}</h1>
          <p style={{ fontSize: 14, color: '#8E8E93' }}>{fmtD(wd.from)} – {fmtD(wd.to)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 32, fontWeight: 700, color: colorMap[color] || '#8E8E93' }}>{score}</p>
          <p style={{ fontSize: 11, color: '#8E8E93' }}>out of 10</p>
        </div>
      </div>

      {/* Progress */}
      <div className="progress-track" style={{ height: 8, borderRadius: 4 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: colorMap[color] || '#E5E5EA', borderRadius: 4 }} />
      </div>

      {/* Week Selector */}
      <div className="card">
        <div className="day-sel">
          <button className="day-btn" onClick={() => goWeek(weekNum - 1)}>‹</button>
          <div style={{ flex: 1, textAlign: 'center' }}><p style={{ fontSize: 15, fontWeight: 600 }}>Week {weekNum} of 100</p></div>
          <button className="day-btn" onClick={() => goWeek(weekNum + 1)}>›</button>
        </div>
        <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 3, borderTop: '0.5px solid rgba(60,60,67,0.12)', paddingTop: 8 }}>
          {Array.from({ length: Math.min(currentWeek, 20) }, (_, i) => Math.max(1, currentWeek - 19) + i).filter(w => w >= 1 && w <= currentWeek).map(w => {
            const c = weekColors[w]; const cMap: Record<string, string> = { 'Green': '#34C759', 'Amber': '#FF9500', 'Red': '#FF3B30' }
            return (
              <button key={w} onClick={() => goWeek(w)} style={{
                padding: '4px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: w === currentWeek && w !== weekNum ? '2px solid #FF2D55' : '1px solid ' + (c ? 'transparent' : '#E5E5EA'),
                background: w === weekNum ? '#FF2D55' : c ? (cMap[c] || '#fff') : '#fff', color: w === weekNum ? '#fff' : c ? '#fff' : '#8E8E93',
              }}>W{w}</button>
            )
          })}
        </div>
      </div>

      {/* Weight (Monday) */}
      <div className="card">
        <div className="row">
          <div className="row-icon" style={{ background: 'rgba(255,149,0,0.12)' }}>⚖️</div>
          <div className="row-body">
            <div><span className="row-label">Monday Weight</span><p style={{ fontSize: 10, color: '#AEAEB2' }}>Weigh-in every Monday morning</p></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {savedItems.weight ? <span className="item-saved">✓</span> : <button className="item-save" onClick={saveWeight}>Save</button>}
              <input className="field-input" type="number" inputMode="decimal" step="0.01" value={form.weight} onChange={e => f('weight', e.target.value)} placeholder="kg" style={{ width: 80, textAlign: 'right', padding: '8px 10px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      <p className="gh">Weekly Photos</p>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '10px 16px 14px' }}>
          {[{ k: 'scale', l: 'Scale', i: '⚖️' }, { k: 'selfie', l: 'Me This Week', i: '🤳' }].map(({ k, l, i }) => (
            <div key={k}>
              <label style={{ cursor: 'pointer', display: 'block' }}>
                <div className="photo-box" style={{ border: previews[k] ? '2px solid #34C759' : existing[k] ? '2px solid #34C75966' : '1.5px dashed #D1D1D6' }}>
                  {(previews[k] || existing[k]) ? <img src={previews[k] || existing[k]} alt={l} /> : <><span style={{ fontSize: 28 }}>{i}</span><span style={{ fontSize: 11, color: '#8E8E93', marginTop: 4 }}>{l}</span></>}
                </div>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const file = e.target.files?.[0]; if (file) { setPhotos(p => ({ ...p, [k]: file })); setPreviews(p => ({ ...p, [k]: URL.createObjectURL(file) })) } }} />
              </label>
              {(previews[k] || photos[k]) && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                  {savedItems[`photo-${k}`] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => savePhoto(k)}>Save</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Must Have's */}
      <p className="gh">Must Have&apos;s · 70%</p>
      <div className="card">
        {MUST.map(h => (
          <div key={h.key} className="row" style={h.type === 'number' ? { flexDirection: 'column', alignItems: 'stretch', gap: 6 } : {}}>
            {h.type === 'number' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="row-icon" style={{ background: 'rgba(255,45,85,0.12)' }}>{h.icon}</div>
                    <div><span className="row-label">{h.label}</span><p style={{ fontSize: 10, color: '#AEAEB2' }}>{h.target}</p></div>
                  </div>
                  {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                </div>
                <input className="field-input" type="number" inputMode="numeric" value={form[h.key]} onChange={e => f(h.key, e.target.value)} placeholder={h.placeholder} />
              </>
            ) : (
              <>
                <div className="row-icon" style={{ background: 'rgba(255,45,85,0.12)' }}>{h.icon}</div>
                <div className="row-body">
                  <div style={{ flex: 1 }}><span className="row-label">{h.label}</span><p style={{ fontSize: 10, color: '#AEAEB2' }}>{h.target}</p></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                    <button className={`tg ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}><div className="k" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Bonus */}
      <p className="gh">Bonus · 30%</p>
      <div className="card">
        {BONUS.map(h => (
          <div key={h.key} className="row" style={h.type === 'number' ? { flexDirection: 'column', alignItems: 'stretch', gap: 6 } : {}}>
            {h.type === 'number' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className="row-icon" style={{ background: 'rgba(52,199,89,0.12)' }}>{h.icon}</div>
                    <div><span className="row-label">{h.label}</span><p style={{ fontSize: 10, color: '#AEAEB2' }}>{h.target}</p></div>
                  </div>
                  {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                </div>
                <input className="field-input" type="number" inputMode="decimal" step={h.step || '1'} value={form[h.key]} onChange={e => f(h.key, e.target.value)} placeholder={h.placeholder} />
              </>
            ) : (
              <>
                <div className="row-icon" style={{ background: 'rgba(52,199,89,0.12)' }}>{h.icon}</div>
                <div className="row-body">
                  <div style={{ flex: 1 }}><span className="row-label">{h.label}</span><p style={{ fontSize: 10, color: '#AEAEB2' }}>{h.target}</p></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {savedItems[h.key] ? <span className="item-saved">✓</span> : <button className="item-save" onClick={() => saveItem(h.key)}>Save</button>}
                    <button className={`tg tg-green ${form[h.key] ? 'on' : 'off'}`} onClick={() => f(h.key, !form[h.key])}><div className="k" /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Update Week */}
      <button onClick={updateWeek} disabled={updating} className="save-all" style={{
        marginTop: 6, opacity: updating ? 0.5 : 1,
        background: dayUpdated ? (colorMap[color] || '#FF2D55') : 'linear-gradient(135deg, #FF2D55, #FF6482)',
      }}>
        {updating ? 'Updating...' : dayUpdated ? `✓ Week ${weekNum} Updated · ${score}/10` : `Update Week ${weekNum}`}
      </button>
    </div>
  )
}
