'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const PADAS = [
  { ch: 1, name: 'Samadhi Pada', desc: 'Chapter of Absorption', count: 51 },
  { ch: 2, name: 'Sadhana Pada', desc: 'Chapter of Practice', count: 55 },
  { ch: 3, name: 'Vibhuti Pada', desc: 'Chapter of Powers', count: 56 },
  { ch: 4, name: 'Kaivalya Pada', desc: 'Chapter of Liberation', count: 34 },
]

export default function Sutras() {
  const [tab, setTab] = useState<'volumes' | 'padas'>('padas')
  const [sutras, setSutras] = useState<any[]>([])
  const [padas, setPadas] = useState<any[]>([])
  const [selVolume, setSelVolume] = useState<any>(null)
  const [selChapter, setSelChapter] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => { if (data) setSutras(data) })
    supabase.from('sutra_padas').select('*').order('chapter').order('sutra_number').then(({ data }) => { if (data) setPadas(data) })
  }, [])

  const formatSummary = (text: string) => {
    if (!text) return null
    return text.split('\n').filter(Boolean).map((line, i) => {
      const trimmed = line.trim()
      if (/^\d+\.\d+:/.test(trimmed)) return <div key={i} className="sutra-ref">{trimmed}</div>
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 100 && !trimmed.includes('.'))
        return <h2 key={i}>{trimmed.charAt(0) + trimmed.slice(1).toLowerCase()}</h2>
      return <p key={i}>{trimmed}</p>
    })
  }

  const chapterSutras = selChapter ? padas.filter(p => p.chapter === selChapter) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Yoga Sutras</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>Patanjali · 196 Sutras · 4 Chapters</p>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, background: '#E5E5EA', borderRadius: 10, padding: 3 }}>
        <button onClick={() => setTab('padas')} style={{
          flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
          background: tab === 'padas' ? '#fff' : 'transparent', color: tab === 'padas' ? '#000' : '#8E8E93',
          cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'padas' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}>4 Padas</button>
        <button onClick={() => setTab('volumes')} style={{
          flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600,
          background: tab === 'volumes' ? '#fff' : 'transparent', color: tab === 'volumes' ? '#000' : '#8E8E93',
          cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'volumes' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}>10 Volumes</button>
      </div>

      {/* PADAS TAB */}
      {tab === 'padas' && !selChapter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PADAS.map(p => {
            const loaded = padas.filter(s => s.chapter === p.ch).length
            return (
              <div key={p.ch} onClick={() => setSelChapter(p.ch)} className="card" style={{ padding: 16, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#FF2D55', letterSpacing: '0.04em', marginBottom: 4 }}>CHAPTER {p.ch}</p>
                    <p style={{ fontSize: 17, fontWeight: 600 }}>{p.name}</p>
                    <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{p.desc} · {p.count} sutras</p>
                  </div>
                  <span style={{ fontSize: 20, color: '#C7C7CC' }}>›</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CHAPTER VIEW - scrollable reading */}
      {tab === 'padas' && selChapter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setSelChapter(null)} style={{ background: 'none', border: 'none', color: '#FF2D55', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '4px 0' }}>
            ← Back to Chapters
          </button>
          <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #FF2D55, #FF6482)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>CHAPTER {selChapter}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>{PADAS[selChapter - 1]?.name}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{PADAS[selChapter - 1]?.desc} · {chapterSutras.length} sutras</p>
          </div>
          {chapterSutras.length === 0 ? (
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}>
              <p style={{ color: '#8E8E93' }}>No sutras loaded yet for this chapter</p>
            </div>
          ) : (
            <div className="card sutra-reader">
              {chapterSutras.map((s, i) => (
                <div key={s.id} style={{ marginBottom: 32, paddingBottom: i < chapterSutras.length - 1 ? 32 : 0, borderBottom: i < chapterSutras.length - 1 ? '0.5px solid rgba(60,60,67,0.12)' : 'none' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#FF2D55', letterSpacing: '0.04em', marginBottom: 8 }}>SUTRA {s.sutra_number}</p>
                  <p style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>
                    {s.sanskrit}
                  </p>
                  {s.word_meanings && (
                    <div style={{ background: 'rgba(255,45,85,0.04)', borderLeft: '3px solid #FF2D55', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                      {s.word_meanings.split(';').map((w: string, j: number) => (
                        <p key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 1 }}>{w.trim()}</p>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 16, lineHeight: 1.85, color: '#333' }}>{s.commentary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VOLUMES TAB */}
      {tab === 'volumes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sutras.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>📖</p>
              <p style={{ fontSize: 15, color: '#8E8E93' }}>No volumes yet</p>
            </div>
          ) : (
            sutras.map(s => (
              <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
                <div onClick={() => setSelVolume(selVolume?.id === s.id ? null : s)}
                  style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#FF2D55', letterSpacing: '0.04em', marginBottom: 4 }}>VOLUME {s.volume}</p>
                    <p style={{ fontSize: 17, fontWeight: 600 }}>{s.title}</p>
                  </div>
                  <span style={{ fontSize: 20, color: '#C7C7CC', transition: 'transform 0.2s', transform: selVolume?.id === s.id ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </div>
                {selVolume?.id === s.id && (
                  <div className="sutra-reader" style={{ borderTop: '0.5px solid rgba(60,60,67,0.12)' }}>
                    {formatSummary(s.summary)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
