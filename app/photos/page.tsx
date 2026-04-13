'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([])

  useEffect(() => {
    supabase.from('photos').select('*').order('day').then(({ data }) => {
      if (data) setPhotos(data)
    })
  }, [])

  const byDay = photos.reduce((acc, p) => {
    if (!acc[p.day]) acc[p.day] = []
    acc[p.day].push(p)
    return acc
  }, {} as Record<number, any[]>)

  return (
    <div className="space-y-6">
      <div className="bg-green-900 text-white rounded-2xl p-5">
        <h1 className="text-2xl font-bold">📸 Photo Journal</h1>
        <p className="text-green-300 text-sm">Your 100 day visual journey</p>
      </div>

      {Object.keys(byDay).length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-gray-500">No photos yet. Upload your daily photos through the check-in page.</p>
        </div>
      ) : (
        Object.entries(byDay).map(([day, dayPhotos]) => (
          <div key={day} className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold text-green-800 mb-3">Day {day}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(dayPhotos as any[]).map(p => (
                <div key={p.id} className="relative">
                  <img src={p.photo_url} alt={p.caption || `Day ${day}`}
                    className="w-full h-48 object-cover rounded-lg" />
                  {p.caption && (
                    <p className="text-xs text-gray-500 mt-1">{p.caption}</p>
                  )}
                  <span className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                    {p.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
