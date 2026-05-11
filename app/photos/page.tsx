'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const TL: Record<string, string> = { scale: '⚖️ Scale', food: '🍽️ Meal' }

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([])
  const [days, setDays] = useState<number[]>([])
  const [attemptId, setAttemptId] = useState(1)
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data }) => {
      const aid = data?.[0]?.attempt_number || 1; setAttemptId(aid)
      supabase.from('photos').select('*').eq('attempt_id', aid).order('day', { ascending: false }).then(({ data: p }) => { if (p) setPhotos(p) })
      supabase.from('daily_logs').select('day').eq('attempt_id', aid).order('day', { ascending: false }).then(({ data: d }) => { if (d) setDays(d.map(x => x.day)) })
    })
  }, [])

  const deletePhoto = async (id: number, photoUrl: string) => {
    // Delete from Storage
    try {
      const url = new URL(photoUrl.split('?')[0])
      const pathParts = url.pathname.split('/storage/v1/object/public/photos/')
      if (pathParts[1]) {
        await supabase.storage.from('photos').remove([decodeURIComponent(pathParts[1])])
      }
    } catch (e) { console.error('Storage delete error:', e) }
    // Delete from database
    await supabase.from('photos').delete().eq('id', id)
    setPhotos(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  // Add cache-busting to photo URLs
  const imgUrl = (url: string) => url ? url.split('?')[0] + '?t=' + Date.now() : ''

  const byDay = photos.reduce((a, p) => { if (!a[p.day]) a[p.day] = []; a[p.day].push(p); return a }, {} as Record<number, any[]>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Photos</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>{photos.length} photos</p>

      {days.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>📷</p>
          <p style={{ fontSize: 15, color: '#8E8E93' }}>No photos yet</p>
        </div>
      ) : (
        days.map(day => {
          const dayPhotos = byDay[day] || []
          const hasScale = dayPhotos.some((p: any) => p.type === 'scale')
          const hasFood = dayPhotos.some((p: any) => p.type === 'food')

          return (
            <div key={day} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 15, fontWeight: 600 }}>Day {day}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                {/* Scale photo or placeholder */}
                {hasScale ? dayPhotos.filter((p: any) => p.type === 'scale').map((p: any) => (
                  <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                    <img src={imgUrl(p.photo_url)} alt="Scale" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>⚖️ Scale</span>
                    </div>
                    {deleting === p.id ? (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Delete this photo?</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => deletePhoto(p.id, p.photo_url)} style={{ padding: '8px 16px', borderRadius: 8, background: '#FF3B30', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                          <button onClick={() => setDeleting(null)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="photo-delete" onClick={() => setDeleting(p.id)}>✕</button>
                    )}
                  </div>
                )) : (
                  <div style={{ aspectRatio: '1', background: '#F2F2F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24 }}>⚖️</span>
                    <span style={{ fontSize: 11, color: '#C7C7CC', marginTop: 4 }}>No weight photo</span>
                  </div>
                )}

                {/* Food photo or placeholder */}
                {hasFood ? dayPhotos.filter((p: any) => p.type === 'food').map((p: any) => (
                  <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                    <img src={imgUrl(p.photo_url)} alt="Meal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 8px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>🍽️ Meal</span>
                    </div>
                    {deleting === p.id ? (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Delete this photo?</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => deletePhoto(p.id, p.photo_url)} style={{ padding: '8px 16px', borderRadius: 8, background: '#FF3B30', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                          <button onClick={() => setDeleting(null)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="photo-delete" onClick={() => setDeleting(p.id)}>✕</button>
                    )}
                  </div>
                )) : (
                  <div style={{ aspectRatio: '1', background: '#F2F2F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 24 }}>🍽️</span>
                    <span style={{ fontSize: 11, color: '#C7C7CC', marginTop: 4 }}>No meal photo</span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
