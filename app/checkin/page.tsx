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

export default function CheckIn() {
  const [form, setForm] = useState({ ...DEFAULT_FORM, day: String(getDayNumber()), date: getDateForDay(getDayNumber()) })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadedDay, setLoadedDay] = useState<number | null>(null)
  const [existingDays, setExistingDays] = useState<number[]>([])

  // Fetch list of existing days on mount
  useEffect(() => {
    supabase.from('daily_logs').select('day').order('day').then(({ data }) => {
      if (data) setExistingDays(data.map(d => d.day))
    })
  }, [saved])

  // Load existing data when day number changes
  const loadDay = async (dayNum: number) => {
    if (!dayNum || dayNum < 1 || dayNum > 100) return
    setLoading(true)

    const { data: habits } = await supabase.from('habits').select('*').eq('day', dayNum).single()
    const { data: log } = await supabase.from('daily_logs').select('*').eq('day', dayNum).single()

    if (habits || log) {
      setForm({
        day: String(dayNum),
        date: log?.date || getDateForDay(dayNum),
        weight: log?.weight ? String(log.weight) : '',
        omad: habits?.omad ?? false,
        meal_description: habits?.meal_description || '',
        steps: habits?.steps ? String(habits.steps) : '',
        meditate: habits?.meditate ?? false,
        meditate_start: habits?.meditate_start || '',
        meditate_end: habits?.meditate_end || '',
        meditate_mins: habits?.meditate_mins ? String(habits.meditate_mins) : '',
        sleep_hours: habits?.sleep_hours ? String(habits.sleep_hours) : '',
        sleep_time: habits?.sleep_time || '',
        wake_time: habits?.wake_time || '',
        zero_content: habits?.zero_content ?? false,
        manifest: habits?.manifest ?? false,
        water_liters: habits?.water_liters ? String(habits.water_liters) : '',
        yoga_sutras: habits?.yoga_sutras ?? false,
        zero_inbox: habits?.zero_inbox ?? false,
        workout: habits?.workout ?? false,
        workout_type: habits?.workout_type || '',
        notes: log?.notes || ''
      })
      setLoadedDay(dayNum)
    } else {
      // No data for this day — reset form but keep day & date
      setForm({ ...DEFAULT_FORM, day: String(dayNum), date: getDateForDay(dayNum) })
      setLoadedDay(null)
    }

    setLoading(false)
  }

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleDayChange = (val: string) => {
    f('day', val)
    const num = parseInt(val)
    if (num >= 1 && num <= 100) {
      f('date', getDateForDay(num))
      loadDay(num)
    }
  }

  const Bool = ({ label, k }: { label: string, k: string }) => (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex gap-2">
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => f(k, v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${(form as any)[k] === v ? (v ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500') : 'bg-white text-gray-600 border-gray-300'}`}>
            {v ? '✅ Yes' : '❌ No'}
          </button>
        ))}
      </div>
    </div>
  )

  const save = async () => {
    if (!form.day) return alert('Please enter day number!')
    setSaving(true)
    const { color, score } = getColor({ ...form, steps: +form.steps, sleep_hours: +form.sleep_hours, water_liters: +form.water_liters })
    await supabase.from('daily_logs').upsert({ day: +form.day, date: form.date, weight: +form.weight, color, score, notes: form.notes }, { onConflict: 'day' })
    await supabase.from('habits').upsert({
      day: +form.day, omad: form.omad, meal_description: form.meal_description,
      steps: +form.steps, meditate: form.meditate, meditate_start: form.meditate_start || null,
      meditate_end: form.meditate_end || null, meditate_mins: +form.meditate_mins || null,
      sleep_hours: +form.sleep_hours, sleep_time: form.sleep_time || null,
      wake_time: form.wake_time || null, zero_content: form.zero_content,
      manifest: form.manifest, water_liters: +form.water_liters,
      yoga_sutras: form.yoga_sutras, zero_inbox: form.zero_inbox,
      workout: form.workout, workout_type: form.workout_type || null
    }, { onConflict: 'day' })
    setSaving(false)
    setSaved(true)
    setLoadedDay(+form.day)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-green-900 text-white rounded-2xl p-4">
        <h1 className="text-xl font-bold">📝 Daily Check-in</h1>
        <p className="text-green-300 text-sm">Log your habits for any day</p>
      </div>

      {/* Day Selector */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => { const d = Math.max(1, (+form.day || 1) - 1); handleDayChange(String(d)) }}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">←</button>
          <div className="flex-1">
            <label className="text-sm text-gray-600">Day #</label>
            <input type="number" value={form.day} onChange={e => handleDayChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mt-1 text-center text-lg font-bold" placeholder="e.g. 1" min={1} max={100} />
          </div>
          <button onClick={() => { const d = Math.min(100, (+form.day || 0) + 1); handleDayChange(String(d)) }}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700">→</button>
        </div>

        {loading && <p className="text-sm text-gray-400 text-center">Loading day data...</p>}
        {loadedDay && !loading && (
          <p className="text-xs text-green-600 text-center font-medium">✏️ Editing existing Day {loadedDay} data</p>
        )}
        {!loadedDay && !loading && form.day && (
          <p className="text-xs text-blue-600 text-center font-medium">🆕 New entry for Day {form.day}</p>
        )}

        {/* Quick jump to existing days */}
        {existingDays.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Quick jump to logged days:</p>
            <div className="flex flex-wrap gap-1">
              {existingDays.map(d => (
                <button key={d} onClick={() => handleDayChange(String(d))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${+form.day === d ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Date</label>
            <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Morning Weight (kg)</label>
            <input type="number" step="0.01" value={form.weight} onChange={e => f('weight', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. 76.50" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <h2 className="font-bold text-red-700">🔴 Non-Negotiables</h2>
        <Bool label="1. OMAD" k="omad" />
        <div>
          <label className="text-sm text-gray-600">What did you eat?</label>
          <textarea value={form.meal_description} onChange={e => f('meal_description', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} placeholder="Describe your meal..." />
        </div>
        <div>
          <label className="text-sm text-gray-600">2. Steps</label>
          <input type="number" value={form.steps} onChange={e => f('steps', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. 12500" />
        </div>
        <Bool label="3. Meditate" k="meditate" />
        {form.meditate && (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">Start</label>
              <input type="time" value={form.meditate_start} onChange={e => f('meditate_start', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">End</label>
              <input type="time" value={form.meditate_end} onChange={e => f('meditate_end', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Mins</label>
              <input type="number" value={form.meditate_mins} onChange={e => f('meditate_mins', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" placeholder="23" />
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500">Sleep Hours</label>
            <input type="number" step="0.1" value={form.sleep_hours} onChange={e => f('sleep_hours', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" placeholder="7" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Sleep Time</label>
            <input type="time" value={form.sleep_time} onChange={e => f('sleep_time', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Wake Time</label>
            <input type="time" value={form.wake_time} onChange={e => f('wake_time', e.target.value)} className="w-full border rounded-lg px-2 py-1 mt-1" />
          </div>
        </div>
        <Bool label="5. Zero Content" k="zero_content" />
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <h2 className="font-bold text-green-700">🟢 Best Effort</h2>
        <Bool label="6. Manifest" k="manifest" />
        <div>
          <label className="text-sm text-gray-600">7. Water (litres)</label>
          <input type="number" step="0.1" value={form.water_liters} onChange={e => f('water_liters', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. 3.2" />
        </div>
        <Bool label="8. Yoga Sutras" k="yoga_sutras" />
        <Bool label="9. Zero Inbox" k="zero_inbox" />
        <Bool label="10. Workout" k="workout" />
        {form.workout && (
          <div>
            <label className="text-sm text-gray-600">Workout Type</label>
            <input type="text" value={form.workout_type} onChange={e => f('workout_type', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. Swimming, Running" />
          </div>
        )}
        <div>
          <label className="text-sm text-gray-600">Notes</label>
          <textarea value={form.notes} onChange={e => f('notes', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" rows={2} placeholder="How are you feeling today?" />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="w-full py-4 rounded-2xl text-white font-bold text-lg transition-all"
        style={{ background: saving ? '#9ca3af' : saved ? '#16a34a' : 'linear-gradient(135deg, #1a4a2e, #16a34a)' }}>
        {saving ? 'Saving...' : saved ? '✅ Saved!' : loadedDay ? `Update Day ${form.day}` : `Save Day ${form.day}`}
      </button>
    </div>
  )
}
