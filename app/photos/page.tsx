'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TYPE_LABELS: Record<string, string> = { scale: '⚖️ Scale', food: '🍽️ Meal', selfie: '🤳 Selfie' }

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([])
  useEffect(() => { supabase.from('photos').select('*').order('day').then(({ data }) => { if (data) setPhotos(data) }) }, [])

  const byDay = photos.reduce((acc, p) => { if (!acc[p.day]) acc[p.day] = []; acc[p.day].push(p); return acc }, {} as Record<number, any[]>)
  const days = Object.keys(byDay).sort((a, b) => Number(b) - Number(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <p className="section-title" style={{ marginBottom: 6 }}>VISUAL JOURNEY</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Photos</h1>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{photos.length} photos · {days.length} days</p>
      </div>

      {days.length === 0 ? (
        <div className="card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>📷</p>
          <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)' }}>No photos yet</p>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>Upload through Check-in</p>
        </div>
      ) : (
        days.map(day => (
          <div key={day} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Day {day}</p>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.3)' }}>{byDay[Number(day)].length} photos</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {byDay[Number(day)].map((p: any) => (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={p.photo_url} alt={p.caption || `Day ${day}`} className="photo-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 600, color: '#fff' }}>{TYPE_LABELS[p.type] || p.type}</span>
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
