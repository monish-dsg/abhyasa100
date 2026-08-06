'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmtD(d: string) { return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }

export default function Photos() {
  const [photos, setPhotos] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1).then(({ data: att }) => {
      const aid = att?.[0]?.attempt_number || 1
      setStartDate(att?.[0]?.start_date || '')
      supabase.from('photos').select('*').eq('attempt_id', aid).order('day', { ascending: false }).then(({ data }) => { if (data) setPhotos(data) })
    })
  }, [])

  const deletePhoto = async (id: number, url: string) => {
    try {
      const pathParts = url.split('?')[0].split('/storage/v1/object/public/photos/')
      if (pathParts[1]) await supabase.storage.from('photos').remove([decodeURIComponent(pathParts[1])])
    } catch (e) { console.error(e) }
    await supabase.from('photos').delete().eq('id', id)
    setPhotos(p => p.filter(x => x.id !== id))
    setDeleting(null)
  }

  const byWeek = photos.reduce((a, p) => { if (!a[p.day]) a[p.day] = []; a[p.day].push(p); return a }, {} as Record<number, any[]>)
  const weeks = Object.keys(byWeek).sort((a, b) => Number(b) - Number(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Photos</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>{photos.length} photos · {weeks.length} weeks</p>

      {weeks.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>📷</p>
          <p style={{ fontSize: 15, color: '#8E8E93' }}>No photos yet</p>
          <p style={{ fontSize: 13, color: '#C7C7CC', marginTop: 4 }}>Upload through the Add page</p>
        </div>
      ) : weeks.map(wk => {
        const weekPhotos = byWeek[Number(wk)]
        const wkFrom = startDate ? fmtD(addDays(startDate, (Number(wk) - 1) * 7)) : ''
        const wkTo = startDate ? fmtD(addDays(startDate, (Number(wk) - 1) * 7 + 6)) : ''
        return (
          <div key={wk} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Week {wk}</p>
              <p style={{ fontSize: 12, color: '#8E8E93' }}>{wkFrom} – {wkTo}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {weekPhotos.map((p: any) => (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden' }}>
                  <img src={p.photo_url + '?t=' + Date.now()} alt={p.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{p.type === 'scale' ? '⚖️ Scale' : '🤳 Me'}</span>
                  </div>
                  {deleting === p.id ? (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <p style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Delete?</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => deletePhoto(p.id, p.photo_url)} style={{ padding: '8px 16px', borderRadius: 8, background: '#FF3B30', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => setDeleting(null)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button className="photo-delete" onClick={() => setDeleting(p.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
