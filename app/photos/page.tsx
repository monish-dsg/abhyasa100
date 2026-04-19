'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TYPE_LABELS: Record<string, string> = {
  scale: '⚖️ Scale',
  food: '🍽️ Meal',
  selfie: '🤳 Selfie',
}

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

  const days = Object.keys(byDay).sort((a, b) => Number(b) - Number(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <style>{`
        .photo-img { transition: transform 0.3s ease; }
        .photo-img:hover { transform: scale(1.05); }
      `}</style>

      {/* Header */}
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>VISUAL JOURNEY</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Photo Journal</h1>
        <p style={{ fontSize: '0.875rem', color: '#86868b', marginTop: 4 }}>
          {photos.length} photos across {days.length} days
        </p>
      </div>

      {days.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>📷</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#6e6e73' }}>No photos yet</p>
          <p style={{ fontSize: '0.8125rem', color: '#86868b', marginTop: 4 }}>Upload your daily photos through the Check-in page</p>
        </div>
      ) : (
        days.map(day => (
          <div key={day} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1d1d1f' }}>Day {day}</p>
              <p style={{ fontSize: '0.75rem', color: '#86868b' }}>{(byDay[Number(day)] as any[]).length} photos</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {(byDay[Number(day)] as any[]).map(p => (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={p.photo_url} alt={p.caption || `Day ${day}`}
                    className="photo-img"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '20px 10px 8px 10px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                  }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'white' }}>
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
