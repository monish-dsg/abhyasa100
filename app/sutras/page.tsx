'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const PADAS = [
  { ch: 1, name: 'Samadhi Pada', desc: 'Chapter of Absorption', count: 51 },
  { ch: 2, name: 'Sadhana Pada', desc: 'Chapter of Practice', count: 55 },
  { ch: 3, name: 'Vibhuti Pada', desc: 'Chapter of Powers', count: 56 },
  { ch: 4, name: 'Kaivalya Pada', desc: 'Chapter of Liberation', count: 34 },
]

const VBT_SECTIONS: Record<string, string> = {
  'VBT.1': 'Breath Techniques',
  'VBT.8': 'Space & Void',
  'VBT.13': 'Sensation & Body',
  'VBT.18': 'Desire & Emotion',
  'VBT.23': 'Sound Techniques',
  'VBT.27': 'Visual & Imagination',
  'VBT.31': 'Daily Life',
  'VBT.38': 'Awareness Techniques',
  'VBT.43': 'Advanced Consciousness',
  'VBT.46': 'The Nature of Reality',
}

const AG_CHAPTERS = [
  { ch: 1, name: 'Instruction on Self-Realization', count: 20 },
  { ch: 2, name: 'Joy of Self-Realization', count: 25 },
  { ch: 3, name: 'Test of the Seeker', count: 14 },
  { ch: 4, name: 'Witness Consciousness', count: 6 },
  { ch: 5, name: 'Dissolution', count: 4 },
  { ch: 6, name: 'The Higher Knowledge', count: 4 },
  { ch: 7, name: 'Realization', count: 5 },
  { ch: 8, name: 'Bondage and Liberation', count: 4 },
  { ch: 9, name: 'Detachment', count: 8 },
  { ch: 10, name: 'Quietude', count: 8 },
  { ch: 11, name: 'Wisdom', count: 8 },
  { ch: 12, name: 'Abiding in the Self', count: 8 },
  { ch: 13, name: 'Happiness', count: 7 },
  { ch: 14, name: 'Tranquility', count: 4 },
  { ch: 15, name: 'Knowledge of the Self', count: 20 },
  { ch: 16, name: 'Special Instruction', count: 11 },
  { ch: 17, name: 'The True Knower', count: 20 },
  { ch: 18, name: 'Peace', count: 100 },
  { ch: 19, name: 'Repose in the Self', count: 8 },
  { ch: 20, name: 'Liberation-in-Life', count: 14 },
]

const BG_CHAPTERS = [
  { ch: 1, name: 'Arjuna\'s Despair', count: 47 },
  { ch: 2, name: 'Sankhya Yoga', count: 72 },
  { ch: 3, name: 'Karma Yoga', count: 43 },
  { ch: 4, name: 'Jnana Yoga', count: 42 },
  { ch: 5, name: 'Sannyasa Yoga', count: 29 },
  { ch: 6, name: 'Dhyana Yoga', count: 47 },
  { ch: 7, name: 'Jnana Vijnana Yoga', count: 30 },
  { ch: 8, name: 'Akshara Brahma Yoga', count: 28 },
  { ch: 9, name: 'Raja Vidya Raja Guhya Yoga', count: 34 },
  { ch: 10, name: 'Vibhuti Yoga', count: 42 },
  { ch: 11, name: 'Vishwarupa Darshana Yoga', count: 55 },
  { ch: 12, name: 'Bhakti Yoga', count: 20 },
  { ch: 13, name: 'Kshetra Kshetrajna Yoga', count: 35 },
  { ch: 14, name: 'Gunatraya Vibhaga Yoga', count: 27 },
  { ch: 15, name: 'Purushottama Yoga', count: 20 },
  { ch: 16, name: 'Daivasura Sampad Yoga', count: 24 },
  { ch: 17, name: 'Shraddhatraya Vibhaga Yoga', count: 28 },
  { ch: 18, name: 'Moksha Yoga', count: 78 },
]

export default function Sutras() {
  const [tab, setTab] = useState<'padas' | 'volumes' | 'vbt' | 'gita' | 'ashtavakra' | 'upanishads'>('padas')
  const [sutras, setSutras] = useState<any[]>([])
  const [padas, setPadas] = useState<any[]>([])
  const [vbt, setVbt] = useState<any[]>([])
  const [gita, setGita] = useState<any[]>([])
  const [ashtavakra, setAshtavakra] = useState<any[]>([])
  const [upanishads, setUpanishads] = useState<any[]>([])
  const [selVolume, setSelVolume] = useState<any>(null)
  const [selChapter, setSelChapter] = useState<number | null>(null)
  const [selAGCh, setSelAGCh] = useState<number | null>(null)
  const [selBGCh, setSelBGCh] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('yoga_sutras').select('*').order('volume').then(({ data }) => { if (data) setSutras(data) })
    supabase.from('sutra_padas').select('*').order('chapter').then(({ data }) => {
      if (data) {
        data.sort((a: any, b: any) => {
          if (a.chapter !== b.chapter) return a.chapter - b.chapter
          const aN = parseFloat(a.sutra_number.split('.').pop() || '0')
          const bN = parseFloat(b.sutra_number.split('.').pop() || '0')
          return aN - bN
        })
        setPadas(data.filter(s => s.chapter <= 4))
        const sortByNum = (a: any, b: any) => { const aN = parseFloat(a.sutra_number.replace(/[^0-9.]/g, '')); const bN = parseFloat(b.sutra_number.replace(/[^0-9.]/g, '')); return aN - bN }
        const vbtData = data.filter(s => s.chapter === 5); vbtData.sort(sortByNum); setVbt(vbtData)
        const gitaData = data.filter(s => s.chapter === 7); gitaData.sort(sortByNum); setGita(gitaData)
        const agData = data.filter(s => s.chapter === 6); agData.sort(sortByNum); setAshtavakra(agData)
        const upData = data.filter(s => s.chapter >= 8 && s.chapter <= 11); upData.sort((a: any, b: any) => { if (a.chapter !== b.chapter) return a.chapter - b.chapter; return sortByNum(a, b) }); setUpanishads(upData)
      }
    })
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

  // Get VBT intro (VBT.0) and dharanas (VBT.1+)
  const vbtIntro = vbt.find(v => v.sutra_number === 'VBT.0')
  const vbtDharanas = vbt.filter(v => v.sutra_number !== 'VBT.0')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Yoga Sutras</h1>
      <p style={{ fontSize: 15, color: '#8E8E93', marginTop: -8 }}>The Library of Awakening</p>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, background: '#E5E5EA', borderRadius: 10, padding: 3, overflowX: 'auto' }}>
        {[
          { key: 'padas' as const, label: 'Yoga Sutras' },
          { key: 'volumes' as const, label: 'Volumes' },
          { key: 'vbt' as const, label: 'VBT' },
          { key: 'gita' as const, label: 'Gita' },
          { key: 'ashtavakra' as const, label: 'Ashtavakra' },
          { key: 'upanishads' as const, label: 'Upanishads' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelChapter(null); setSelAGCh(null); setSelBGCh(null) }} style={{
            flex: '0 0 auto', padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#000' : '#8E8E93',
            cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* PADAS TAB - Chapter List */}
      {tab === 'padas' && !selChapter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PADAS.map(p => (
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
          ))}
        </div>
      )}

      {/* PADAS TAB - Chapter Reading */}
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
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>No sutras loaded yet</p></div>
          ) : (
            <div className="card sutra-reader">
              {chapterSutras.map((s, i) => (
                <div key={s.id} style={{ marginBottom: 32, paddingBottom: i < chapterSutras.length - 1 ? 32 : 0, borderBottom: i < chapterSutras.length - 1 ? '0.5px solid rgba(60,60,67,0.12)' : 'none' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#FF2D55', letterSpacing: '0.04em', marginBottom: 8 }}>SUTRA {s.sutra_number}</p>
                  <p style={{ fontSize: 18, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>{s.sanskrit}</p>
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

      {/* VBT TAB */}
      {tab === 'vbt' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* VBT Intro */}
          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #5856D6, #7B79E8)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>VIJNANA BHAIRAVA TANTRA</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>112 Ways to the Divine</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.6 }}>
              A conversation between Shiva and Devi. She asks: &ldquo;What is your true nature?&rdquo; He responds with 112 meditation techniques — practical doorways that can be practiced anywhere, anytime.
            </p>
          </div>

          {vbtDharanas.length === 0 ? (
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>No dharanas loaded yet. Run the VBT SQL in Supabase.</p></div>
          ) : (
            <div className="card sutra-reader">
              {vbtDharanas.map((s, i) => {
                const sectionTitle = VBT_SECTIONS[s.sutra_number]
                return (
                  <div key={s.id}>
                    {sectionTitle && (
                      <div style={{ textAlign: 'center', margin: i > 0 ? '28px 0 20px' : '8px 0 20px', padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(88,86,214,0.15)' : 'none' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#5856D6', letterSpacing: '0.08em' }}>{sectionTitle.toUpperCase()}</p>
                      </div>
                    )}
                    <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: '0.5px solid rgba(60,60,67,0.08)' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#5856D6', letterSpacing: '0.04em', marginBottom: 8 }}>
                        {s.sutra_number.replace('VBT.', 'DHARANA ')}
                      </p>
                      <p style={{ fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>{s.sanskrit}</p>
                      {s.word_meanings && (
                        <div style={{ background: 'rgba(88,86,214,0.04)', borderLeft: '3px solid #5856D6', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                          {s.word_meanings.split(';').map((w: string, j: number) => (
                            <p key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 1 }}>{w.trim()}</p>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: 16, lineHeight: 1.85, color: '#333' }}>{s.commentary}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {/* GITA TAB — Chapter List */}
      {tab === 'gita' && !selBGCh && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #FF9500, #FFB340)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>BHAGAVAD GITA</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>The Song of God</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.6 }}>18 chapters · 700 verses · Krishna speaks to Arjuna</p>
          </div>
          {BG_CHAPTERS.map(c => (
            <div key={c.ch} onClick={() => setSelBGCh(c.ch)} className="card" style={{ padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#FF9500', letterSpacing: '0.04em', marginBottom: 4 }}>CHAPTER {c.ch}</p>
                  <p style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</p>
                  <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{c.count} verses</p>
                </div>
                <span style={{ fontSize: 20, color: '#C7C7CC' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GITA — Reading a chapter */}
      {tab === 'gita' && selBGCh && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setSelBGCh(null)} style={{ background: 'none', border: 'none', color: '#FF9500', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '4px 0' }}>← Back to Chapters</button>
          <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #FF9500, #FFB340)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>CHAPTER {selBGCh}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>{BG_CHAPTERS.find(c => c.ch === selBGCh)?.name}</p>
          </div>
          {(() => {
            const verses = gita.filter(s => s.sutra_number.startsWith(selBGCh + '.'))
            return verses.length === 0 ? (
              <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>No verses loaded yet for this chapter.</p></div>
            ) : (
              <div className="card sutra-reader">
                {verses.map((s, i) => (
                  <div key={s.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i < verses.length - 1 ? '0.5px solid rgba(60,60,67,0.08)' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#FF9500', letterSpacing: '0.04em', marginBottom: 8 }}>VERSE {s.sutra_number}</p>
                    <p style={{ fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>{s.sanskrit}</p>
                    {s.word_meanings && (
                      <div style={{ background: 'rgba(255,149,0,0.04)', borderLeft: '3px solid #FF9500', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                        {s.word_meanings.split(';').map((w: string, j: number) => (<p key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 1 }}>{w.trim()}</p>))}
                      </div>
                    )}
                    <p style={{ fontSize: 16, lineHeight: 1.85, color: '#333' }}>{s.commentary}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* ASHTAVAKRA TAB — Chapter List */}
      {tab === 'ashtavakra' && !selAGCh && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #30D158, #34C759)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>ASHTAVAKRA GITA</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>The Song of Absolute Freedom</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.6 }}>20 chapters · 298 verses · &ldquo;You are already free&rdquo;</p>
          </div>
          {AG_CHAPTERS.map(c => (
            <div key={c.ch} onClick={() => setSelAGCh(c.ch)} className="card" style={{ padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#30D158', letterSpacing: '0.04em', marginBottom: 4 }}>CHAPTER {c.ch}</p>
                  <p style={{ fontSize: 17, fontWeight: 600 }}>{c.name}</p>
                  <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{c.count} verses</p>
                </div>
                <span style={{ fontSize: 20, color: '#C7C7CC' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASHTAVAKRA — Reading a chapter */}
      {tab === 'ashtavakra' && selAGCh && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setSelAGCh(null)} style={{ background: 'none', border: 'none', color: '#30D158', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '4px 0' }}>← Back to Chapters</button>
          <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #30D158, #34C759)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>CHAPTER {selAGCh}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>{AG_CHAPTERS.find(c => c.ch === selAGCh)?.name}</p>
          </div>
          {(() => {
            const verses = ashtavakra.filter(s => s.sutra_number.startsWith(selAGCh + '.'))
            return verses.length === 0 ? (
              <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>No verses loaded yet for this chapter.</p></div>
            ) : (
              <div className="card sutra-reader">
                {verses.map((s, i) => (
                  <div key={s.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i < verses.length - 1 ? '0.5px solid rgba(60,60,67,0.08)' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#30D158', letterSpacing: '0.04em', marginBottom: 8 }}>VERSE {s.sutra_number}</p>
                    <p style={{ fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>{s.sanskrit}</p>
                    {s.word_meanings && (
                      <div style={{ background: 'rgba(52,199,89,0.04)', borderLeft: '3px solid #30D158', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                        {s.word_meanings.split(';').map((w: string, j: number) => (<p key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 1 }}>{w.trim()}</p>))}
                      </div>
                    )}
                    <p style={{ fontSize: 16, lineHeight: 1.85, color: '#333' }}>{s.commentary}</p>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* UPANISHADS TAB */}
      {tab === 'upanishads' && !selChapter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>THE UPANISHADS</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 4 }}>Sitting Near the Truth</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 1.6 }}>The philosophical heart of the Vedas — flashes of direct insight into the nature of reality.</p>
          </div>
          {[
            { ch: 8, name: 'Isha Upanishad', desc: 'The Lord Dwells in Everything', count: 18 },
            { ch: 9, name: 'Kena Upanishad', desc: 'By Whose Power?', count: 35 },
            { ch: 10, name: 'Katha Upanishad', desc: 'Death as Teacher', count: 120 },
            { ch: 11, name: 'Mandukya Upanishad', desc: 'The Shortest Path', count: 12 },
          ].map(u => (
            <div key={u.ch} onClick={() => setSelChapter(u.ch)} className="card" style={{ padding: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 600 }}>{u.name}</p>
                  <p style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{u.desc} · {u.count} verses</p>
                </div>
                <span style={{ fontSize: 20, color: '#C7C7CC' }}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* UPANISHADS — Reading a specific Upanishad */}
      {tab === 'upanishads' && selChapter && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setSelChapter(null)} style={{ background: 'none', border: 'none', color: '#AF52DE', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: '4px 0' }}>← Back to Upanishads</button>
          <div className="card" style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
              {selChapter === 8 ? 'Isha Upanishad' : selChapter === 9 ? 'Kena Upanishad' : selChapter === 10 ? 'Katha Upanishad' : 'Mandukya Upanishad'}
            </p>
          </div>
          {upanishads.filter(s => s.chapter === selChapter).length === 0 ? (
            <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}><p style={{ color: '#8E8E93' }}>No verses loaded yet. Run the SQL for this Upanishad.</p></div>
          ) : (
            <div className="card sutra-reader">
              {upanishads.filter(s => s.chapter === selChapter).map((s, i, arr) => (
                <div key={s.id} style={{ marginBottom: 28, paddingBottom: 28, borderBottom: i < arr.length - 1 ? '0.5px solid rgba(60,60,67,0.08)' : 'none' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#AF52DE', letterSpacing: '0.04em', marginBottom: 8 }}>VERSE {s.sutra_number}</p>
                  <p style={{ fontSize: 17, fontWeight: 600, fontStyle: 'italic', color: '#333', lineHeight: 1.5, marginBottom: 12 }}>{s.sanskrit}</p>
                  {s.word_meanings && (
                    <div style={{ background: 'rgba(175,82,222,0.04)', borderLeft: '3px solid #AF52DE', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 12 }}>
                      {s.word_meanings.split(';').map((w: string, j: number) => (<p key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.5, marginBottom: 1 }}>{w.trim()}</p>))}
                    </div>
                  )}
                  <p style={{ fontSize: 16, lineHeight: 1.85, color: '#333' }}>{s.commentary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
