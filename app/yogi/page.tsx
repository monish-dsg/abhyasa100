'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WELCOME = 'Namaste. I am Yogi — your guide on the path of Abhyasa.\n\nI see your data. I know your patterns. I will hold you accountable and guide you with the wisdom of the sutras.\n\nTell me about your day, ask me anything, or upload a food photo for analysis.'

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width, h = img.height
        const max = 800
        if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max } else { w = Math.round(w * max / h); h = max } }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [attemptId, setAttemptId] = useState(1)
  const bottom = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveChat = async (role: string, message: string, aid: number) => {
    try { await supabase.from('chat_messages').insert({ role, message, attempt_id: aid }) } catch (e: any) { console.error('Chat save:', e.message) }
  }

  useEffect(() => {
    (async () => {
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1; setAttemptId(aid)
      try {
        const { data: chats } = await supabase.from('chat_messages').select('*').eq('attempt_id', aid).order('created_at', { ascending: true })
        if (chats && chats.length > 0) setMessages(chats.map((c: any) => ({ role: c.role, content: c.message })))
        else { setMessages([{ role: 'assistant', content: WELCOME }]); await saveChat('assistant', WELCOME, aid) }
      } catch (e) { setMessages([{ role: 'assistant', content: WELCOME }]) }
      setLoadingHistory(false)
    })()
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearChats = async () => {
    try { await supabase.from('chat_messages').delete().eq('attempt_id', attemptId) } catch (e) { await supabase.from('chat_messages').delete().neq('id', 0) }
    const msg = 'Chat cleared.\n\n' + WELCOME
    setMessages([{ role: 'assistant', content: msg }]); await saveChat('assistant', msg, attemptId)
  }

  const send = async () => {
    if (!input.trim() && !photo) return
    const userContent = input.trim()
    if (userContent.toLowerCase().includes('clear') && userContent.toLowerCase().includes('chat')) { setInput(''); await clearChats(); return }

    const userMsg = { role: 'user', content: userContent || 'Analyze this food photo' }
    setMessages(p => [...p, userMsg]); setInput(''); setLoading(true)
    await saveChat('user', userMsg.content, attemptId)

    try {
      const body: any = { messages: [...messages, userMsg], attemptId }
      if (photo) { try { body.photo = await compressImage(photo); body.photoType = 'image/jpeg' } catch (e) { console.error('Compress:', e) } }

      const res = await fetch('/api/yogi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
      await saveChat('assistant', data.reply, attemptId)
    } catch (err: any) {
      const errMsg = `I encountered an issue. Please try again.`
      setMessages(p => [...p, { role: 'assistant', content: errMsg }])
    }
    setPhoto(null); setPhotoPreview(''); setLoading(false)
  }

  if (loadingHistory) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em' }}>Yogi</h1>
          <p style={{ fontSize: 13, color: '#8E8E93' }}>Your guide on the path · {messages.length} messages</p>
        </div>
        <button onClick={clearChats} style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'rgba(255,59,48,0.08)', color: '#FF3B30', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 16 }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #FF2D55, #FF6482)' : '#F2F2F7',
                color: m.role === 'user' ? '#fff' : '#1C1C1E', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex' }}>
              <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: '#F2F2F7', color: '#8E8E93', fontSize: 14 }}>
                <span className="typing-dots">Yogi is reflecting</span>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>

        {photoPreview && (
          <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={photoPreview} alt="Upload" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: '#8E8E93', flex: 1 }}>Photo attached</span>
            <button onClick={() => { setPhoto(null); setPhotoPreview('') }} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        <div style={{ padding: 12, borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} style={{ width: 38, height: 38, borderRadius: 19, background: '#F2F2F7', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask Yogi anything..."
            style={{ flex: 1, padding: '10px 16px', borderRadius: 20, border: '1px solid #E5E5EA', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#fff' }} />
          <button onClick={send} disabled={loading}
            style={{ width: 38, height: 38, borderRadius: 19, background: loading ? '#E5E5EA' : 'linear-gradient(135deg, #FF2D55, #FF6482)', border: 'none', color: '#fff', fontSize: 16, cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  )
}
