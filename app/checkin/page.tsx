'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

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

export default function CheckIn() {
  const [form, setForm] = useState({
    day: '', date: new Date().toISOString().split('T')[0],
    weight: '', omad: false, meal_description: '',
    steps: '', meditate: false, meditate_start: '',
    meditate_end: '', meditate_mins: '',
    sleep_hours: '', sleep_time: '', wake_time: '',
    zero_content: false, manifest: false,
    water_liters: '', yoga_sutras: false,
    zero_inbox: false, workout: false, workout_type: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

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
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-green-900 text-white rounded-2xl p-4">
        <h1 className="text-xl font-bold">📝 Daily Check-in</h1>
        <p className="text-green-300 text-sm">Log your habits for the day</p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-gray-600">Day #</label>
            <input type="number" value={form.day} onChange={e => f('day', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" placeholder="e.g. 8" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Date</label>
            <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
        </di
