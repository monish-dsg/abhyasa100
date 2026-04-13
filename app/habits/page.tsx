'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Habits() {
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('habits').select('*').order('day').then(({ data }) => { if (data) setHabits(data) })
    supabase.from('daily_logs').select('*').order('day').then(({ data }) => { if (data) setLogs(data) })
  }, [])

  const pct = (fn: (h: any) => boolean) => habits.length ? Math.round((habits.filter(fn).length / habits.length) * 100) : 0
  const avg = (fn: (h: any) => number) => habits.length ? (habits.reduce((a, h) => a + (fn(h) || 0), 0) / habits.length).toFixed(1) : 0

  const stats = [
    { label: '🍽️ OMAD', value: `${pct(h => h.omad)}%`, sub: `${habits.filter(h => h.omad).length}/${habits.length} days` },
    { label: '🚶 10k Steps', value: `${pct(h => h.steps >= 10000)}%`, sub: `Avg ${avg(h => h.steps)} steps` },
    { label: '🧘 Meditation', value: `${pct(h => h.meditate)}%`, sub: `${habits.filter(h => h.meditate).length}/${habits.length} days` },
    { label: '😴 6hr Sleep', value: `${pct(h => h.sleep_hours >= 6)}%`, sub: `Avg ${avg(h => h.sleep_hours)} hrs` },
    { label: '📵 Zero Content', value: `${pct(h => h.zero_content)}%`, sub: `${habits.filter(h => h.zero_content).length}/${habits.length} days` },
    { label: '✨ Manifest', value: `${pct(h => h.manifest)}%`, sub: `${habits.filter(h => h.manifest).length}/${habits.length} days` },
    { label: '💧 3L Water', value: `${pct(h => h.water_liters >= 3)}%`, sub: `Avg ${avg(h => h.water_liters)}L` },
    { label: '📖 Yoga Sutras', value: `${pct(h => h.yoga_sutras)}%`, sub: `${habits.filter(h => h.yoga_sutras).length}/${habits.length} days` },
    { label: '📬 Zero Inbox', value: `${pct(h => h.zero_inbox)}%`, sub: `${habits.filter(h => h.zero_inbox).length}/${habits.length} days` },
    { label: '💪 Workout', value: `${pct(h => h.workout)}%`, sub: `${habits.filter(h => h.workout).length}/${habits.length} days` },
  ]

  const workouts = habits.filter(h => h.workout && h.workout_type)

  return (
    <div className="space-y-6">
      <div className="bg-green-900 text-white rounded-2xl p-5">
        <h1 className="text-2xl font-bold">📊 Habit Tracker</h1>
        <p className="text-green-300 text-sm">Your 10 disciplines over 100 days</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow p-4">
            <p className="font-bold text-gray-700">{s.label}</p>
            <p className="text-3xl font-bold text-green-800 mt-1">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-bold text-gray-700 mb-3">💪 Workout Log</h2>
        {workouts.length === 0 ? (
          <p className="text-gray-400 text-sm">No workouts logged yet</p>
        ) : (
          <div className="space-y-2">
            {workouts.map(h => (
              <div key={h.day} className="flex justify-between items-center py-2 border-b">
                <span className="font-medium text-green-800">Day {h.day}</span>
                <span className="text-sm text-gray-600">{h.workout_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <h2 className="font-bold text-gray-700 p-4 border-b">📋 Daily Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Day', 'OMAD', 'Steps', 'Med', 'Sleep', 'Content', 'Manifest', 'Water', 'Sutras', 'Inbox', 'Workout'].map(h => (
                  <th key={h} className="p-2 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.day} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-bold">{h.day}</td>
                  <td className="p-2">{h.omad ? '✅' : '❌'}</td>
                  <td className="p-2">{h.steps?.toLocaleString()}</td>
                  <td className="p-2">{h.meditate ? '✅' : '❌'}</td>
                  <td className="p-2">{h.sleep_hours}h</td>
                  <td className="p-2">{h.zero_content ? '✅' : '❌'}</td>
                  <td className="p-2">{h.manifest ? '✅' : '❌'}</td>
                  <td className="p-2">{h.water_liters}L</td>
                  <td className="p-2">{h.yoga_sutras ? '✅' : '❌'}</td>
                  <td className="p-2">{h.zero_inbox ? '✅' : '❌'}</td>
                  <td className="p-2">{h.workout ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
