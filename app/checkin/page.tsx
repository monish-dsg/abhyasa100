'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// @ts-nocheck
const CHALLENGE_START = new Date('2026-04-20')
function getDayNumber(): number { const d = Math.floor((new Date().getTime() - CHALLENGE_START.getTime()) / (1000*60*60*24)); return Math.max(1, d + 1) }
function getDateForDay(day: number): string { const d = new Date(CHALLENGE_START); d.setDate(d.getDate() + day - 1); return d.toISOString().split('T')[0] }

const getColor = (d: any) => {
  const nonNeg = [d.omad, d.steps >= 10000, d.meditate, d.sleep_hours >= 6, d.zero_content]
  const missed = nonNeg.filter((v: boolean) => v === false).length
  const bonus = [d.manifest, d.water_liters >= 3, d.yoga_sutras, d.zero_inbox, d.workout]
  const bonusDone = bonus.filter(Boolean).length
  if (missed === 0 && bonusDone === 5) return { color: 'Dark Green', score: 10 }
  if (missed === 0) return { color: 'Green', score: 5 + bonusDone }
  if (missed === 1) return { color: 'Orange', score: 4 + bonusDone }
  return { color: 'Red', score: nonNeg.filter(Boolean).length + bonusDone }
}

const DEFAULT_FORM: any = {
  day: '', date: new Date().toISOString().split('T')[0], weight: '', omad: false, meal_description: '',
  steps: '', meditate: false, meditate_start: '', meditate_end: '', meditate_mins: '',
  sleep_hours: '', sleep_time: '', wake_time: '', zero_content: false, manifest: false,
  water_liters: '', yoga_sutras: false, zero_inbox: false, workout: false, workout_type: '', notes: ''
}

const PHOTO_TYPES = [
  { key: 'scale', label: 'Scale', icon: '⚖️' },
  { key: 'food', label: 'Meal', icon: '🍽️' },
  { key: 'selfie', label: 'Selfie', icon: '🤳' },
]

export default function CheckIn() {
  const [form, setForm] = useState({ ...DEFAULT_FORM, day: String(getDayNumber()), date: getDateForDay(getDayNumber()) })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadedDay, setLoadedDay] = useState<number | null>(null)
  const [existingDays, setExistingDays] = useState<number[]>([])
  const [photos, setPhotos] = useState<Record<string, File | null>>({ scale: null, food: null, selfie: null })
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({ scale: '', food: '', selfie: '' })
  const [existingPhotos, setExistingPhotos] = useState<Record<string, string>>({ scale: '', food: '', selfie: '' })
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [whoopConnected, setWhoopConnected] = useState<boolean | null>(null)
  const [whoopSyncing, setWhoopSyncing] = useState(false)
  const [whoopSynced, setWhoopSynced] = useState(false)
  const [whoopFields, setWhoopFields] = useState<string[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('day').order('day').then(({ data }) => { if (data) setExistingDays(data.map(d => d.day)) })
    fetch('/api/whoop/sync?date=2026-01-01').then(r => r.json()).then(d => setWhoopConnected(d.connected !== false)).catch(() => setWhoopConnected(false))
  }, [saved])

  const syncWhoop = async () => {
    if (!form.date) return; setWhoopSyncing(true); setWhoopSynced(false); setWhoopFields([])
    try {
      const res = await fetch(`/api/whoop/sync?date=${form.date}`); const data = await res.json()
      if (!data.connected) { setWhoopConnected(false); setWhoopSyncing(false); return }
      const filled: string[] = []
      if (data.sleep) {
        if (data.sleep.sleep_hours) { setForm((p: any) => ({ ...p, sleep_hours: String(data.sleep.sleep_hours) })); filled.push('Sleep') }
        if (data.sleep.sleep_time) { setForm((p: any) => ({ ...p, sleep_time: data.sleep.sleep_time })); filled.push('Bedtime') }
        if (data.sleep.wake_time) { setForm((p: any) => ({ ...p, wake_time: data.sleep.wake_time })); filled.push('Wake') }
      }
      if (data.steps != null) { setForm((p: any) => ({ ...p, steps: String(data.steps) })); filled.push('Steps') }
      if (data.meditation) {
        setForm((p: any) => ({ ...p, meditate: true })); filled.push('Meditation')
        if (data.meditation.meditate_mins) setForm((p: any) => ({ ...p, meditate_mins: String(data.meditation.meditate_mins) }))
        if (data.meditation.meditate_start) setForm((p: any) => ({ ...p, meditate_start: data.meditation.meditate_start }))
        if (data.meditation.meditate_end) setForm((p: any) => ({ ...p, meditate_end: data.meditation.meditate_end }))
      }
      if (data.workout) {
        setForm((p: any) => ({ ...p, workout: true })); filled.push('Workout')
        if (data.workout.workout_type) setForm((p: any) => ({ ...p, workout_type: data.workout.workout_type }))
      }
      setWhoopFields(filled); setWhoopSynced(true)
    } catch (e) { console.error(e) }
    setWhoopSyncing(false)
  }

  const loadPhotosForDay = async (dayNum: number) => {
    const { data } = await supabase.from('photos').select('*').eq('day', dayNum)
    const ep: Record<string, string> = { scale: '', food: '', selfie: '' }
    if (data) data.forEach((p: any) => { if (ep.hasOwnProperty(p.type)) ep[p.type] = p.photo_url })
    setExistingPhotos(ep)
  }

  const loadDay = async (dayNum: number) => {
    if (!dayNum || dayNum < 1 || dayNum > 100) return; setLoading(true); setWhoopSynced(false); setWhoopFields([])
    const { data: habits } = await supabase.from('habits').select('*').eq('day', dayNum).single()
    const { data: log } = await supabase.from('daily_logs').select('*').eq('day', dayNum).single()
    if (habits || log) {
      setForm({ day: String(dayNum), date: log?.date || getDateForDay(dayNum), weight: log?.weight ? String(log.weight) : '',
        omad: habits?.omad ?? false, meal_description: habits?.meal_description || '', steps: habits?.steps ? String(habits.steps) : '',
        meditate: habits?.meditate ?? false, meditate_start: habits?.meditate_start || '', meditate_end: habits?.meditate_end || '',
        meditate_mins: habits?.meditate_mins ? String(habits.meditate_mins) : '', sleep_hours: habits?.sleep_hours ? String(habits.sleep_hours) : '',
        sleep_time: habits?.sleep_time || '', wake_time: habits?.wake_time || '', zero_content: habits?.zero_content ?? false,
        manifest: habits?.manifest ?? false, water_liters: habits?.water_liters ? String(habits.water_liters) : '',
        yoga_sutras: habits?.yoga_sutras ?? false, zero_inbox: habits?.zero_inbox ?? false, workout: habits?.workout ?? false,
        workout_type: habits?.workout_type || '', notes: log?.notes || '' })
      setLoadedDay(dayNum)
    } else { setForm({ ...DEFAULT_FORM, day: String(dayNum), date: getDateForDay(dayNum) }); setLoadedDay(null) }
    await loadPhotosForDay(dayNum)
    setPhotos({ scale: null, food: null, selfie: null }); setPhotoPreviews({ scale: '', food: '', selfie: '' }); setLoading(false)
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }))
  const handleDayChange = (val: string) => { f('day', val); const num = parseInt(val); if (num >= 1 && num <= 100) { f('date', getDateForDay(num)); loadDay(num) } }
  const handlePhotoSelect = (type: string, file: File | null) => {
    setPhotos(p => ({ ...p, [type]: file }))
    setPhotoPreviews(p => ({ ...p, [type]: file ? URL.createObjectURL(file) : '' }))
  }

  const uploadPhotos = async (dayNum: number) => {
    const pts = Object.entries(photos).filter(([_, f]) => f !== null); if (!pts.length) return; setUploadingPhotos(true)
    for (const [type, file] of pts) {
      if (!file) continue; const ext = file.name.split('.').pop() || 'jpg'; const fp = `day-${dayNum}/${type}.${ext}`
      await supabase.storage.from('photos').upload(fp, file, { upsert: true })
      const { data: u } = supabase.storage.from('photos').getPublicUrl(fp)
      const { data: ex } = await supabase.from('photos').select('id').eq('day', dayNum).eq('type', type).single()
      if (ex) await supabase.from('photos').update({ photo_url: u.publicUrl, caption: type }).eq('id', ex.id)
      else await supabase.from('photos').insert({ day: dayNum, type, photo_url: u.publicUrl, caption: type })
    }
    setUploadingPhotos(false)
  }

  const Bool = ({ label, k }: { label: string, k: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => f(k, v)} style={{
            padding: '8px 20px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            ...((form as any)[k] === v
              ? (v ? { background: '#00D1A0', color: '#0B0B0B' } : { background: '#FF3B3B', color: '#0B0B0B' })
              : { background: '#222', color: 'rgba(255,255,255,0.4)' })
          }}>{v ? '✅ Yes' : '❌ No'}</button>
        ))}
      </div>
    </div>
  )

  const save = async () => {
    if (!form.day) return alert('Enter day number!'); setSaving(true); const dayNum = +form.day
    const { color, score } = getColor({ ...form, steps: +form.steps, sleep_hours: +form.sleep_hours, water_liters: +form.water_liters })
    await supabase.from('daily_logs').upsert({ day: dayNum, date: form.date, weight: +form.weight, color, score, notes: form.notes }, { onConflict: 'day' })
    await supabase.from('habits').upsert({ day: dayNum, omad: form.omad, meal_description: form.meal_description, steps: +form.steps,
      meditate: form.meditate, meditate_start: form.meditate_start || null, meditate_end: form.meditate_end || null,
      meditate_mins: +form.meditate_mins || null, sleep_hours: +form.sleep_hours, sleep_time: form.sleep_time || null,
      wake_time: form.wake_time || null, zero_content: form.zero_content, manifest: form.manifest, water_liters: +form.water_liters,
      yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox, workout: form.workout, workout_type: form.workout_type || null
    }, { onConflict: 'day' })
    await uploadPhotos(dayNum); setSaving(false); setSaved(true); setLoadedDay(dayNum)
    await loadPhotosForDay(dayNum); setPhotos({ scale: null, food: null, selfie: null }); setPhotoPreviews({ scale: '', food: '', selfie: '' })
    setTimeout(() => setSaved(false), 3000)
  }

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p className="section-title">{title}</p>{children}
    </div>
  )

  const Input = ({ label, ...props }: any) => (
    <div>
      <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 4 }}>{label}</label>
      <input {...props} />
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ marginBottom: 4 }}>
        <p className="section-title" style={{ marginBottom: 6 }}>DAILY LOG</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Check-in</h1>
      </div>

      {/* Whoop Sync */}
      <div className="card" style={{ padding: '18px 24px', borderColor: 'rgba(0,209,160,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: whoopSynced ? 12 : 0 }}>
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⌚ WHOOP
              {whoopConnected && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#00D1A0', background: 'rgba(0,209,160,0.12)', padding: '2px 8px', borderRadius: 100 }}>CONNECTED</span>}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {whoopConnected === false ? 'Connect to auto-fill data' : 'Sleep · Steps · Workouts · Meditation'}
            </p>
          </div>
          {whoopConnected === false ? (
            <a href="/api/whoop/login" style={{ padding: '8px 16px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700, background: '#00D1A0', color: '#0B0B0B', textDecoration: 'none' }}>Connect</a>
          ) : (
            <button onClick={syncWhoop} disabled={whoopSyncing} style={{ padding: '8px 16px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 700, background: whoopSyncing ? '#333' : '#00D1A0', color: '#0B0B0B', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {whoopSyncing ? '...' : '↻ Sync'}
            </button>
          )}
        </div>
        {whoopSynced && whoopFields.length > 0 && (
          <div style={{ background: 'rgba(0,209,160,0.08)', borderRadius: 10, padding: '8px 14px', fontSize: '0.75rem', color: '#00D1A0', fontWeight: 500 }}>
            ✅ {whoopFields.join(' · ')}
          </div>
        )}
        {whoopSynced && whoopFields.length === 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 14px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            No data for this date yet
          </div>
        )}
      </div>

      {/* Day Selector */}
      <div className="card" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => handleDayChange(String(Math.max(1, (+form.day || 1) - 1)))}
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#222', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <input type="number" value={form.day} onChange={e => handleDayChange(e.target.value)}
              style={{ width: 80, textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, border: 'none', background: 'transparent', fontFamily: 'inherit', color: '#fff', outline: 'none' }} min={1} max={100} />
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
              {loading ? 'Loading...' : loadedDay ? `Editing Day ${loadedDay}` : form.day ? 'New entry' : 'Enter day'}
            </p>
          </div>
          <button onClick={() => handleDayChange(String(Math.min(100, (+form.day || 0) + 1)))}
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#222', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#fff' }}>→</button>
        </div>
        {existingDays.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {existingDays.map(d => (
                <button key={d} onClick={() => handleDayChange(String(d))} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: +form.day === d ? '#00D1A0' : '#222', color: +form.day === d ? '#0B0B0B' : 'rgba(255,255,255,0.4)',
                }}>{d}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Section title="BASICS">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Date" type="date" value={form.date} onChange={(e: any) => f('date', e.target.value)} />
          <Input label="Weight (kg)" type="number" step="0.01" value={form.weight} onChange={(e: any) => f('weight', e.target.value)} placeholder="76.5" />
        </div>
      </Section>

      <Section title="PHOTOS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PHOTO_TYPES.map(({ key, label, icon }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#141414', marginBottom: 8, position: 'relative',
                border: photoPreviews[key] ? '2px solid #00D1A0' : existingPhotos[key] ? '2px solid rgba(0,209,160,0.3)' : '2px dashed rgba(255,255,255,0.08)' }}>
                {(photoPreviews[key] || existingPhotos[key]) ? (
                  <img src={photoPreviews[key] || existingPhotos[key]} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem' }}>{icon}</div>
                )}
                {photoPreviews[key] && (
                  <button onClick={() => handlePhotoSelect(key, null)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '0.625rem', cursor: 'pointer' }}>✕</button>
                )}
              </div>
              <label style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#00D1A0' }}>{label}</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => handlePhotoSelect(key, e.target.files?.[0] || null)} />
              </label>
            </div>
          ))}
        </div>
      </Section>

      <Section title="NON-NEGOTIABLES">
        <Bool label="1. OMAD" k="omad" />
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 4 }}>What did you eat?</label>
          <textarea value={form.meal_description} onChange={e => f('meal_description', e.target.value)} rows={2} placeholder="Describe your meal..."
            style={{ width: '100%', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', fontFamily: 'inherit', background: '#141414', color: '#fff', resize: 'vertical' }} />
        </div>
        <Input label="2. Steps" type="number" value={form.steps} onChange={(e: any) => f('steps', e.target.value)} placeholder="12500" />
        <Bool label="3. Meditate" k="meditate" />
        {form.meditate && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Input label="Start" type="time" value={form.meditate_start} onChange={(e: any) => f('meditate_start', e.target.value)} />
            <Input label="End" type="time" value={form.meditate_end} onChange={(e: any) => f('meditate_end', e.target.value)} />
            <Input label="Mins" type="number" value={form.meditate_mins} onChange={(e: any) => f('meditate_mins', e.target.value)} placeholder="20" />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Input label="Sleep Hours" type="number" step="0.1" value={form.sleep_hours} onChange={(e: any) => f('sleep_hours', e.target.value)} placeholder="7" />
          <Input label="Sleep Time" type="time" value={form.sleep_time} onChange={(e: any) => f('sleep_time', e.target.value)} />
          <Input label="Wake Time" type="time" value={form.wake_time} onChange={(e: any) => f('wake_time', e.target.value)} />
        </div>
        <Bool label="5. Zero Content" k="zero_content" />
      </Section>

      <Section title="BEST EFFORT">
        <Bool label="6. Manifest" k="manifest" />
        <Input label="7. Water (litres)" type="number" step="0.1" value={form.water_liters} onChange={(e: any) => f('water_liters', e.target.value)} placeholder="3.2" />
        <Bool label="8. Yoga Sutras" k="yoga_sutras" />
        <Bool label="9. Zero Inbox" k="zero_inbox" />
        <Bool label="10. Workout" k="workout" />
        {form.workout && <Input label="Workout Type" type="text" value={form.workout_type} onChange={(e: any) => f('workout_type', e.target.value)} placeholder="Swimming, Running..." />}
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} placeholder="How are you feeling?"
            style={{ width: '100%', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', fontFamily: 'inherit', background: '#141414', color: '#fff', resize: 'vertical' }} />
        </div>
      </Section>

      <button onClick={save} disabled={saving || uploadingPhotos} className="btn-primary"
        style={{ width: '100%', padding: 16, fontSize: '1rem', marginBottom: 40, opacity: (saving || uploadingPhotos) ? 0.5 : 1 }}>
        {uploadingPhotos ? '📸 Uploading...' : saving ? 'Saving...' : saved ? '✅ Saved!' : loadedDay ? `Update Day ${form.day}` : `Save Day ${form.day}`}
      </button>
    </div>
  )
}
