'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Sutras() {
  const [sutras, setSutras] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => {
      if (data) setSutras(data)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div className="bg-green-900 text-white rounded-2xl p-5">
        <h1 className="text-2xl font-bold">📖 Yoga Sutras</h1>
        <p className="text-green-300 text-sm">Patanjali · Osho · 10 Volumes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sutras.map(s => (
          <div key={s.id} onClick={() => setSelected(selected?.id === s.id ? null : s)}
            className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-2 border-transparent hover:border-green-600">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-green-700 font-bold uppercase">Volume {s.volume}</p>
                <h2 className="font-bold text-gray-800 mt-1">{s.title}</h2>
              </div>
              <span className="text-2xl">📚</span>
            </div>
            {selected?.id === s.id && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-bold text-green-700 uppercase mb-2">Yogi Summary</p>
                <p className="text-sm text-gray-600 leading-relaxed">{s.summary}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {sutras.length === 0 && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-4xl mb-3">📖</p>
          <p className="text-gray-500">No volumes uploaded yet. Share the PDF text with Yogi to add summaries.</p>
        </div>
      )}
    </div>
  )
}
