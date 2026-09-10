'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const canvas = document.createElement('canvas'); const reader = new FileReader()
    reader.onload = (e) => { img.onload = () => { let w = img.width, h = img.height; const max = 800; if (w > max || h > max) { if (w > h) { h = Math.round(h*max/w); w = max } else { w = Math.round(w*max/h); h = max } }; canvas.width = w; canvas.height = h; canvas.getContext('2d')!.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]) }; img.onerror = reject; img.src = e.target?.result as string }
    reader.onerror = reject; reader.readAsDataURL(file)
  })
}

const QUICK_ACTIONS = [
  { label: 'How was my week?', icon: '📊' },
  { label: 'Today\'s sutra', icon: '📖' },
  { label: 'What should I focus on?', icon: '🎯' },
  { label: 'Motivate me', icon: '🔥' },
]

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [attemptId, setAttemptId] = useState(1)
  const [showWelcome, setShowWelcome] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveChat = async (role: string, message: string, aid: number) => {
    try { await supabase.from('chat_messages').insert({ role, message, attempt_id: aid }) } catch (e) {}
  }

  useEffect(() => {
    (async () => {
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1; setAttemptId(aid)
      try {
        const { data: chats } = await supabase.from('chat_messages').select('*').eq('attempt_id', aid).order('created_at', { ascending: true })
        if (chats && chats.length > 0) { setMessages(chats.map((c: any) => ({ role: c.role, content: c.message }))); setShowWelcome(false) }
        else setShowWelcome(true)
      } catch (e) { setShowWelcome(true) }
      setLoadingHistory(false)
    })()
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearChats = async () => {
    try { await supabase.from('chat_messages').delete().eq('attempt_id', attemptId) } catch (e) { await supabase.from('chat_messages').delete().neq('id', 0) }
    setMessages([]); setShowWelcome(true)
  }

  const send = async (text?: string) => {
    const userContent = text || input.trim()
    if (!userContent && !photo) return
    if (userContent.toLowerCase().includes('clear') && userContent.toLowerCase().includes('chat')) { setInput(''); await clearChats(); return }

    setShowWelcome(false)
    const userMsg = { role: 'user', content: userContent || 'Analyze this food photo' }
    setMessages(p => [...p, userMsg]); setInput(''); setLoading(true)
    await saveChat('user', userMsg.content, attemptId)

    try {
      const body: any = { messages: [...messages, userMsg], attemptId }
      if (photo) { try { body.photo = await compressImage(photo); body.photoType = 'image/jpeg' } catch (e) {} }
      const res = await fetch('/api/yogi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
      await saveChat('assistant', data.reply, attemptId)
    } catch (err) {
      setMessages(p => [...p, { role: 'assistant', content: 'I encountered an issue. Please try again.' }])
    }
    setPhoto(null); setPhotoPreview(''); setLoading(false)
  }

  if (loadingHistory) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}><p style={{ color: '#8E8E93' }}>Loading...</p></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #5856D6, #7B79E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧘</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>Yogi</h1>
            <p style={{ fontSize: 11, color: '#8E8E93' }}>Your guide on the path of Abhyasa</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChats} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'rgba(142,142,147,0.08)', color: '#8E8E93', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
        )}
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#FAFAFA', borderRadius: 20, border: '1px solid rgba(60,60,67,0.06)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>

          {/* Welcome State */}
          {showWelcome && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '24px 16px' }}>
              <div style={{ width: 72, height: 72, borderRadius: 36, background: 'linear-gradient(135deg, #5856D6, #7B79E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 16, boxShadow: '0 8px 24px rgba(88,86,214,0.25)' }}>🧘</div>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1C1C1E', marginBottom: 4 }}>Namaste</p>
              <p style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 1.6, maxWidth: 280, marginBottom: 24 }}>
                I see your data, your patterns, your progress. Ask me anything or choose below.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%', maxWidth: 320 }}>
                {QUICK_ACTIONS.map(qa => (
                  <button key={qa.label} onClick={() => send(qa.label)} style={{
                    padding: '14px 12px', borderRadius: 14, border: '1px solid rgba(88,86,214,0.15)', background: '#fff',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>{qa.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', lineHeight: 1.3 }}>{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10, alignItems: 'flex-end', gap: 6 }}>
              {m.role !== 'user' && (
                <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, #5856D6, #7B79E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🧘</div>
              )}
              <div style={{
                maxWidth: '78%', padding: '12px 16px',
                borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #FF2D55, #FF6482)' : '#fff',
                color: m.role === 'user' ? '#fff' : '#1C1C1E',
                fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                boxShadow: m.role === 'user' ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>{m.content}</div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: 'linear-gradient(135deg, #5856D6, #7B79E8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧘</div>
              <div style={{ padding: '14px 20px', borderRadius: '20px 20px 20px 4px', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C7C7CC', animation: 'pulse 1.2s infinite' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C7C7CC', animation: 'pulse 1.2s infinite 0.2s' }} />
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C7C7CC', animation: 'pulse 1.2s infinite 0.4s' }} />
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions — show after messages too */}
          {!showWelcome && messages.length > 0 && !loading && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, marginBottom: 4 }}>
              {QUICK_ACTIONS.map(qa => (
                <button key={qa.label} onClick={() => send(qa.label)} style={{
                  padding: '6px 12px', borderRadius: 16, border: '1px solid rgba(88,86,214,0.12)', background: '#fff',
                  fontSize: 12, fontWeight: 500, color: '#5856D6', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {qa.icon} {qa.label}
                </button>
              ))}
            </div>
          )}

          <div ref={bottom} />
        </div>

        {/* Photo Preview */}
        {photoPreview && (
          <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(60,60,67,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
            <img src={photoPreview} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: '#8E8E93', flex: 1 }}>Photo attached</span>
            <button onClick={() => { setPhoto(null); setPhotoPreview('') }} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(60,60,67,0.06)', display: 'flex', gap: 8, alignItems: 'center', background: '#fff', borderRadius: '0 0 20px 20px' }}>
          <button onClick={() => fileRef.current?.click()} style={{
            width: 36, height: 36, borderRadius: 18, background: '#F2F2F7', border: 'none', fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s',
          }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Yogi..."
            style={{ flex: 1, padding: '10px 16px', borderRadius: 20, border: '1px solid #E5E5EA', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#F9F9F9' }} />
          <button onClick={() => send()} disabled={loading || (!input.trim() && !photo)}
            style={{
              width: 36, height: 36, borderRadius: 18, border: 'none', cursor: loading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, color: '#fff',
              background: (!input.trim() && !photo) || loading ? '#E5E5EA' : 'linear-gradient(135deg, #5856D6, #7B79E8)',
              transition: 'background 0.15s',
            }}>↑</button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
