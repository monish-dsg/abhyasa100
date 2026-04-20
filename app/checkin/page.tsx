'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// @ts-nocheck

const CHALLENGE_START = new Date('2026-04-20')

function getDayNumber(): number {
  const today = new Date()
  const diff = Math.floor((today.getTime() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, diff + 1)
}

function getDateForDay(day: number): string {
  const d = new Date(CHALLENGE_START)
  d.setDate(d.getDate() + day - 1)
  return d.toISOString().split('T')[0]
}

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

const DEFAULT_FORM = {
  day: '', date: new Date().toISOString().split('T')[0],
  weight: '', omad: false, meal_description: '',
  steps: '', meditate: false, meditate_start: '',
  meditate_end: '', meditate_mins: '',
  sleep_hours: '', sleep_time: '', wake_time: '',
  zero_content: false, manifest: false,
  water_liters: '', yoga_sutras: false,
  zero_inbox: false, workout: false, workout_type: '', notes: ''
}

const PHOTO_TYPES = [
  { key: 'scale', label: 'Weighing Scale', icon: '⚖️' },
  { key: 'food', label: 'Food / Meal', icon: '🍽️' },
  { key: 'selfie', label: 'Daily Selfie', icon: '🤳' },
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

  // Whoop state
  const [whoopConnected, setWhoopConnected] = useState<boolean | null>(null)
  const [whoopSyncing, setWhoopSyncing] = useState(false)
  const [whoopSynced, setWhoopSynced] = useState(false)
  const [whoopFields, setWhoopFields] = useState<string[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('day').order('day').then(({ data }) => {
      if (data) setExistingDays(data.map(d => d.day))
    })
    // Check Whoop connection on load
    checkWhoopConnection()
  }, [saved])

  const checkWhoopConnection = async () => {
    try {
      const res = await fetch('/api/whoop/sync?date=2026-01-01')
      const data = await res.json()
      setWhoopConnected(data.connected !== false)
    } catch {
      setWhoopConnected(false)
    }
  }

  const syncWhoop = async () => {
    if (!form.date) return
    setWhoopSyncing(true)
    setWhoopSynced(false)
    setWhoopFields([])

    try {
      const res = await fetch(`/api/whoop/sync?date=${form.date}`)
      const data = await res.json()

      if (!data.connected) {
        setWhoopConnected(false)
        setWhoopSyncing(false)
        return
      }

      const filled: string[] = []

      // Sleep data
      if (data.sleep) {
        if (data.sleep.sleep_hours) { setForm(p => ({ ...p, sleep_hours: String(data.sleep.sleep_hours) })); filled.push('Sleep hours') }
        if (data.sleep.sleep_time) { setForm(p => ({ ...p, sleep_time: data.sleep.sleep_time })); filled.push('Sleep time') }
        if (data.sleep.wake_time) { setForm(p => ({ ...p, wake_time: data.sleep.wake_time })); filled.push('Wake time') }
      }

      // Steps
      if (data.steps !== null && data.steps !== undefined) {
        setForm(p => ({ ...p, steps: String(data.steps) }))
        filled.push('Steps')
      }

      // Meditation
      if (data.meditation) {
        setForm(p => ({ ...p, meditate: true }))
        filled.push('Meditation')
        if (data.meditation.meditate_mins) { setForm(p => ({ ...p, meditate_mins: String(data.meditation.meditate_mins) })); filled.push('Meditation mins') }
        if (data.meditation.meditate_start) setForm(p => ({ ...p, meditate_start: data.meditation.meditate_start }))
        if (data.meditation.meditate_end) setForm(p => ({ ...p, meditate_end: data.meditation.meditate_end }))
      }

      // Workout
      if (data.workout) {
        setForm(p => ({ ...p, workout: true }))
        filled.push('Workout')
        if (data.workout.workout_type) { setForm(p => ({ ...p, workout_type: data.workout.workout_type })); filled.push(data.workout.workout_type) }
      }

      setWhoopFields(filled)
      setWhoopSynced(true)
    } catch (e: any) {
      console.error('Whoop sync error:', e)
    }

    setWhoopSyncing(false)
  }

  const loadPhotosForDay = async (dayNum: number) => {
    const { data } = await supabase.from('photos').select('*').eq('day', dayNum)
    const ep: Record<string, string> = { scale: '', food: '', selfie: '' }
    if (data) data.forEach((p: any) => { if (p.type && ep.hasOwnProperty(p.type)) ep[p.type] = p.photo_url })
    setExistingPhotos(ep)
  }

  const loadDay = async (dayNum: number) => {
    if (!dayNum || dayNum < 1 || dayNum > 100) return
    setLoading(true)
    setWhoopSynced(false)
    setWhoopFields([])
    const { data: habits } = await supabase.from('habits').select('*').eq('day', dayNum).single()
    const { data: log } = await supabase.from('daily_logs').select('*').eq('day', dayNum).single()
    if (habits || log) {
      setForm({
        day: String(dayNum), date: log?.date || getDateForDay(dayNum),
        weight: log?.weight ? String(log.weight) : '',
        omad: habits?.omad ?? false, meal_description: habits?.meal_description || '',
        steps: habits?.steps ? String(habits.steps) : '',
        meditate: habits?.meditate ?? false, meditate_start: habits?.meditate_start || '',
        meditate_end: habits?.meditate_end || '', meditate_mins: habits?.meditate_mins ? String(habits.meditate_mins) : '',
        sleep_hours: habits?.sleep_hours ? String(habits.sleep_hours) : '',
        sleep_time: habits?.sleep_time || '', wake_time: habits?.wake_time || '',
        zero_content: habits?.zero_content ?? false, manifest: habits?.manifest ?? false,
        water_liters: habits?.water_liters ? String(habits.water_liters) : '',
        yoga_sutras: habits?.yoga_sutras ?? false, zero_inbox: habits?.zero_inbox ?? false,
        workout: habits?.workout ?? false, workout_type: habits?.workout_type || '',
        notes: log?.notes || ''
      })
      setLoadedDay(dayNum)
    } else {
      setForm({ ...DEFAULT_FORM, day: String(dayNum), date: getDateForDay(dayNum) })
      setLoadedDay(null)
    }
    await loadPhotosForDay(dayNum)
    setPhotos({ scale: null, food: null, selfie: null })
    setPhotoPreviews({ scale: '', food: '', selfie: '' })
    setLoading(false)
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleDayChange = (val: string) => {
    f('day', val)
    const num = parseInt(val)
    if (num >= 1 && num <= 100) { f('date', getDateForDay(num)); loadDay(num) }
  }

  const handlePhotoSelect = (type: string, file: File | null) => {
    setPhotos(p => ({ ...p, [type]: file }))
    if (file) {
      setPhotoPreviews(p => ({ ...p, [type]: URL.createObjectURL(file) }))
    } else {
      setPhotoPreviews(p => ({ ...p, [type]: '' }))
    }
  }

  const uploadPhotos = async (dayNum: number) => {
    const photoTypes = Object.entries(photos).filter(([_, file]) => file !== null)
    if (photoTypes.length === 0) return
    setUploadingPhotos(true)
    for (const [type, file] of photoTypes) {
      if (!file) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `day-${dayNum}/${type}.${ext}`
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file, { upsert: true })
      if (uploadError) { console.error(`Upload failed:`, uploadError); continue }
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath)
      const photo_url = urlData.publicUrl
      const { data: existing } = await supabase.from('photos').select('id').eq('day', dayNum).eq('type', type).single()
      if (existing) { await supabase.from('photos').update({ photo_url, caption: type }).eq('id', existing.id) }
      else { await supabase.from('photos').insert({ day: dayNum, type, photo_url, caption: type }) }
    }
    setUploadingPhotos(false)
  }

  const Bool = ({ label, k }: { label: string, k: string }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6e6e73' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => f(k, v)}
            style={{
              padding: '8px 20px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
              ...((form as any)[k] === v
                ? (v ? { background: '#2d6a4f', color: 'white' } : { background: '#e63946', color: 'white' })
                : { background: '#f0f0f0', color: '#6e6e73' })
            }}>
            {v ? '✅ Yes' : '❌ No'}
          </button>
        ))}
      </div>
    </div>
  )

  const save = async () => {
    if (!form.day) return alert('Please enter day number!')
    setSaving(true)
    const dayNum = +form.day
    const { color, score } = getColor({ ...form, steps: +form.steps, sleep_hours: +form.sleep_hours, water_liters: +form.water_liters })
    await supabase.from('daily_logs').upsert({ day: dayNum, date: form.date, weight: +form.weight, color, score, notes: form.notes }, { onConflict: 'day' })
    await supabase.from('habits').upsert({
      day: dayNum, omad: form.omad, meal_description: form.meal_description,
      steps: +form.steps, meditate: form.meditate, meditate_start: form.meditate_start || null,
      meditate_end: form.meditate_end || null, meditate_mins: +form.meditate_mins || null,
      sleep_hours: +form.sleep_hours, sleep_time: form.sleep_time || null,
      wake_time: form.wake_time || null, zero_content: form.zero_content,
      manifest: form.manifest, water_liters: +form.water_liters,
      yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox,
      workout: form.workout, workout_type: form.workout_type || null
    }, { onConflict: 'day' })
    await uploadPhotos(dayNum)
    setSaving(false)
    setSaved(true)
    setLoadedDay(dayNum)
    await loadPhotosForDay(dayNum)
    setPhotos({ scale: null, food: null, selfie: null })
    setPhotoPreviews({ scale: '', food: '', selfie: '' })
    setTimeout(() => setSaved(false), 3000)
  }

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#86868b' }}>{title}</p>
      {children}
    </div>
  )

  const Input = ({ label, ...props }: any) => (
    <div>
      <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6e6e73', display: 'block', marginBottom: 4 }}>{label}</label>
      <input {...props} style={{ width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', fontFamily: 'inherit', background: 'white', ...props.style }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <p className="section-title" style={{ marginBottom: 6 }}>DAILY LOG</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Check-in</h1>
      </div>

      {/* Whoop Sync Card */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: whoopSynced ? 12 : 0 }}>
          <div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem' }}>⌚</span> WHOOP
              {whoopConnected === true && <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2d6a4f', background: 'rgba(45,106,79,0.08)', padding: '2px 8px', borderRadius: 100 }}>Connected</span>}
            </p>
            <p style={{ fontSize: '0.6875rem', color: '#86868b', marginTop: 2 }}>
              {whoopConnected === false ? 'Connect to auto-fill sleep, steps, workouts & meditation' : 'Auto-fill sleep, steps, workouts & meditation'}
            </p>
          </div>
          {whoopConnected === false ? (
            <a href="/api/whoop/login" style={{
              padding: '8px 16px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 600,
              background: '#1d1d1f', color: 'white', textDecoration: 'none', display: 'inline-block',
            }}>Connect</a>
          ) : (
            <button onClick={syncWhoop} disabled={whoopSyncing} style={{
              padding: '8px 16px', borderRadius: 10, fontSize: '0.8125rem', fontWeight: 600,
              background: whoopSyncing ? '#c7c7cc' : '#2d6a4f', color: 'white', border: 'none',
              cursor: whoopSyncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {whoopSyncing ? 'Syncing...' : '↻ Sync'}
            </button>
          )}
        </div>
        {whoopSynced && whoopFields.length > 0 && (
          <div style={{
            background: 'rgba(45,106,79,0.06)', borderRadius: 10, padding: '10px 14px',
            fontSize: '0.75rem', color: '#2d6a4f', fontWeight: 500,
          }}>
            ✅ Filled: {whoopFields.join(', ')}
          </div>
        )}
        {whoopSynced && whoopFields.length === 0 && (
          <div style={{
            background: 'rgba(134,134,139,0.08)', borderRadius: 10, padding: '10px 14px',
            fontSize: '0.75rem', color: '#86868b', fontWeight: 500,
          }}>
            No Whoop data found for this date. Data may not have synced yet.
          </div>
        )}
      </div>

      {/* Day Selector */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => { const d = Math.max(1, (+form.day || 1) - 1); handleDayChange(String(d)) }}
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#f0f0f0', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#1d1d1f' }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <input type="number" value={form.day} onChange={e => handleDayChange(e.target.value)}
              style={{ width: 80, textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, border: 'none', background: 'transparent', fontFamily: 'inherit', color: '#1d1d1f', outline: 'none' }} min={1} max={100} />
            <p style={{ fontSize: '0.75rem', color: '#86868b', marginTop: 2 }}>
              {loading ? 'Loading...' : loadedDay ? `✏️ Editing Day ${loadedDay}` : form.day ? '🆕 New entry' : 'Enter day'}
            </p>
          </div>
          <button onClick={() => { const d = Math.min(100, (+form.day || 0) + 1); handleDayChange(String(d)) }}
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: '#f0f0f0', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#1d1d1f' }}>→</button>
        </div>

        {existingDays.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: '0.6875rem', color: '#86868b', marginBottom: 6 }}>LOGGED DAYS</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {existingDays.map(d => (
                <button key={d} onClick={() => handleDayChange(String(d))}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    background: +form.day === d ? '#2d6a4f' : '#f0f0f0',
                    color: +form.day === d ? 'white' : '#6e6e73',
                  }}>{d}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Weight & Date */}
      <Section title="BASICS">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Date" type="date" value={form.date} onChange={(e: any) => f('date', e.target.value)} />
          <Input label="Morning Weight (kg)" type="number" step="0.01" value={form.weight} onChange={(e: any) => f('weight', e.target.value)} placeholder="76.50" />
        </div>
      </Section>

      {/* Photos */}
      <Section title="DAILY PHOTOS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PHOTO_TYPES.map(({ key, label, icon }) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{
                aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: '#f0f0f0',
                marginBottom: 8, position: 'relative',
                border: photoPreviews[key] ? '2px solid #2d6a4f' : existingPhotos[key] ? '2px solid rgba(45,106,79,0.3)' : '2px dashed rgba(0,0,0,0.1)',
              }}>
                {(photoPreviews[key] || existingPhotos[key]) ? (
                  <img src={photoPreviews[key] || existingPhotos[key]} alt={label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.5rem' }}>{icon}</div>
                )}
                {photoPreviews[key] && (
                  <button onClick={() => handlePhotoSelect(key, null)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', fontSize: '0.6875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                )}
              </div>
              <label style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#2d6a4f' }}>
                  {existingPhotos[key] ? 'Replace' : 'Add'} {label}
                </span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => handlePhotoSelect(key, e.target.files?.[0] || null)} />
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* Non-Negotiables */}
      <Section title="NON-NEGOTIABLES">
        <Bool label="1. OMAD (One Meal a Day)" k="omad" />
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6e6e73', display: 'block', marginBottom: 4 }}>What did you eat?</label>
          <textarea value={form.meal_description} onChange={e => f('meal_description', e.target.value)}
            rows={2} placeholder="Describe your meal..."
            style={{ width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }} />
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

      {/* Best Effort */}
      <Section title="BEST EFFORT">
        <Bool label="6. Manifest" k="manifest" />
        <Input label="7. Water (litres)" type="number" step="0.1" value={form.water_liters} onChange={(e: any) => f('water_liters', e.target.value)} placeholder="3.2" />
        <Bool label="8. Yoga Sutras" k="yoga_sutras" />
        <Bool label="9. Zero Inbox" k="zero_inbox" />
        <Bool label="10. Workout" k="workout" />
        {form.workout && (
          <Input label="Workout Type" type="text" value={form.workout_type} onChange={(e: any) => f('workout_type', e.target.value)} placeholder="Swimming, Running..." />
        )}
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#6e6e73', display: 'block', marginBottom: 4 }}>Notes</label>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)}
            rows={2} placeholder="How are you feeling today?"
            style={{ width: '100%', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
      </Section>

      {/* Save Button */}
      <button onClick={save} disabled={saving || uploadingPhotos}
        className="btn-primary"
        style={{
          width: '100%', padding: '16px', fontSize: '1rem', marginBottom: 40,
          opacity: (saving || uploadingPhotos) ? 0.5 : 1,
        }}>
        {uploadingPhotos ? '📸 Uploading photos...' : saving ? 'Saving...' : saved ? '✅ Saved!' : loadedDay ? `Update Day ${form.day}` : `Save Day ${form.day}`}
      </button>
    </div>
  )
}
