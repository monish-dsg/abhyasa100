'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WELCOME = '🙏 Namaste Monish. I am Yogi — your coach, your mirror, your fire.\n\nTell me about your day. Upload your food. Ask me anything. I see everything in your data and I will hold nothing back.\n\nSay "clear past chats" to start fresh.'

// Compress image to max 800px and convert to base64
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const reader = new FileReader()
    reader.onload = (e) => {
      img.onload = () => {
        let w = img.width, h = img.height
        const max = 800
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max }
          else { w = Math.round(w * max / h); h = max }
        }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataUrl.split(',')[1])
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
    try {
      await supabase.from('chat_messages').insert({ role, message, attempt_id: aid })
    } catch (e: any) { console.error('Chat save error:', e.message) }
  }

  useEffect(() => {
    (async () => {
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1
      setAttemptId(aid)
      try {
        const { data: chats } = await supabase.from('chat_messages').select('*').eq('attempt_id', aid).order('created_at', { ascending: true })
        if (chats && chats.length > 0) {
          setMessages(chats.map((c: any) => ({ role: c.role, content: c.message })))
        } else {
          setMessages([{ role: 'assistant', content: WELCOME }])
          await saveChat('assistant', WELCOME, aid)
        }
      } catch (e) {
        setMessages([{ role: 'assistant', content: WELCOME }])
      }
      setLoadingHistory(false)
    })()
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearChats = async () => {
    await supabase.from('chat_messages').delete().eq('attempt_id', attemptId).catch(() => {
      supabase.from('chat_messages').delete().neq('id', 0)
    })
    const msg = '🧹 Cleared. Let\'s start fresh.\n\n' + WELCOME
    setMessages([{ role: 'assistant', content: msg }])
    await saveChat('assistant', msg, attemptId)
  }

  const send = async () => {
    if (!input.trim() && !photo) return
    const userContent = input.trim()

    if (userContent.toLowerCase().includes('clear past chats') || userContent.toLowerCase().includes('clear chats')) {
      setInput(''); await clearChats(); return
    }

    const userMsg = { role: 'user', content: userContent || '📷 Food photo uploaded — please analyze the macros' }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)
    await saveChat('user', userMsg.content, attemptId)

    try {
      const body: any = { messages: [...messages, userMsg], attemptId }

      // Compress photo before sending
      if (photo) {
        try {
          const compressed = await compressImage(photo)
          body.photo = compressed
          body.photoType = 'image/jpeg'
        } catch (e) {
          console.error('Image compression failed:', e)
        }
      }

      const res = await fetch('/api/yogi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
      await saveChat('assistant', data.reply, attemptId)

      if (data.saved?.success) {
        const sysContent = `Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/11)`
        setMessages(p => [...p, { role: 'system', content: sysContent }])
        await saveChat('system', sysContent, attemptId)
      }
    } catch (err: any) {
      const errContent = `Error: ${err.message}`
      setMessages(p => [...p, { role: 'assistant', content: errContent }])
      await saveChat('assistant', errContent, attemptId)
    }

    setPhoto(null); setPhotoPreview(''); setLoading(false)
  }

  if (loadingHistory) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading chats...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Yogi</h1>
      <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 12 }}>Your AI coach · {messages.length} messages</p>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start', marginBottom: 10 }}>
              {m.role === 'system' ? (
                <div className="chat-saved">✓ {m.content}</div>
              ) : (
                <div className={m.role === 'user' ? 'chat-user' : 'chat-ai'} style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              )}
            </div>
          ))}
          {loading && <div style={{ display: 'flex' }}><div className="chat-ai" style={{ color: '#8E8E93' }}>Yogi is thinking... 🧘</div></div>}
          <div ref={bottom} />
        </div>

        {photoPreview && (
          <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={photoPreview} alt="Upload" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: '#8E8E93', flex: 1 }}>Photo ready to send</span>
            <button onClick={() => { setPhoto(null); setPhotoPreview('') }} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        <div style={{ padding: 12, borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 18, background: '#F2F2F7', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
          <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Talk to Yogi..." />
          <button className="chat-send" onClick={send} disabled={loading} style={{ opacity: loading ? 0.5 : 1 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
