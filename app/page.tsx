'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const COLOR_STYLES: Record<string, string> = {
  'Dark Green': 'bg-green-900 text-white',
  'Green': 'bg-green-500 text-white',
  'Orange': 'bg-orange-500 text-white',
  'Red': 'bg-red-500 text-white',
}

export default function Dashboard() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('*').order('day').then(({ data }) => {
      if (data) setLogs(data)
    })
  }, [])

  const latest = logs[logs.length - 1]
  const darkGreen = logs.filter(l => l.color === 'Dark Green').length
  const green = logs.filter(l => l.color === 'Green').length
  const orange = logs.filter(l => l.color === 'Orange').length
  const red = logs.filter(l => l.color === 'Red').length
  const progress = latest ? ((78.35 - latest.weight) / (78.35 - 66)) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900 to-green-600 text-white rounded-2xl p-6">
        <h1 className="text-3xl font-bold">🧘 Abhyasa100</h1>
        <p className="text-green-200 mt-1">Monish Shah · Founder & CEO, DreamSetGo · Day {logs.length} of 100</p>
        <p className="text-green-300 text-sm mt-1 italic">"Abhyasa and Vairagya — Practice and Desirelessness"</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <p className="text-gray-500 text-sm">Start Weight</p>
          <p className="text-2xl font-bold text-green-800">78.35 kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <p className="text-gray-500 text-sm">Current Weight</p>
          <p className="text-2xl font-bold text-green-800">{latest?.weight ?? '—'} kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <p className="text-gray-500 text-sm">Target Weight</p>
          <p className="text-2xl font-bold text-green-800">66 kg</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow text-center">
          <p className="text-gray-500 text-sm">Days Done</p>
          <p className="text-2xl font-bold text-green-800">{logs.length}/100</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold text-gray-700 mb-2">⚖️ Weight Progress</h2>
        <div className="bg-gray-200 rounded-full h-4">
          <div className="bg-green-600 h-4 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <p className="text-sm text-gray-500 mt-1 text-center">
          {latest ? (78.35 - latest.weight).toFixed(2) : 0} kg lost · {latest ? (latest.weight - 66).toFixed(2) : 12.35} kg to go
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-900 text-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{darkGreen}</p>
          <p className="text-sm">🌑 Dark Green</p>
        </div>
        <div className="bg-green-500 text-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{green}</p>
          <p className="text-sm">🟢 Green</p>
        </div>
        <div className="bg-orange-500 text-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{orange}</p>
          <p className="text-sm">🟠 Orange</p>
        </div>
        <div className="bg-red-500 text-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold">{red}</p>
          <p className="text-sm">🔴 Red</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <h2 className="font-bold text-gray-700 mb-3">📅 Calendar</h2>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: 100 }, (_, i) => {
            const log = logs.find(l => l.day === i + 1)
            const colorClass = log ? COLOR_STYLES[log.color] : 'bg-gray-100 text-gray-400'
            return (
              <div key={i} className={`${colorClass} rounded-lg p-2 text-center text-xs font-bold`}>
                {i + 1}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow divide-y">
        <h2 className="font-bold text-gray-700 mb-3">📋 Daily Log</h2>
        {[...logs].reverse().map(l => (
          <div key={l.id} className="py-3 flex justify-between items-center">
            <div>
              <span className="font-bold text-green-800">Day {l.day}</span>
              <span className="text-gray-400 text-xs ml-2">{l.date}</span>
              <p className="text-xs text-gray-500">{l.weight} kg</p>
            </div>
            <span className={`${COLOR_STYLES[l.color]} px-3 py-1 rounded-full text-xs font-bold`}>
              {l.score}/10
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
