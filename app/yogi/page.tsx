'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WELCOME = '🙏 Namaste Monish. I am Yogi — your AI coach.\n\nI can track habits, analyze food photos, recommend workouts, review your week, predict your weight goal, and coach you with Patanjali\'s wisdom.\n\nJust talk to me. Say "clear past chats" to start fresh.'

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

  // Save a single message to database
  const saveChat = async (role: string, message: string, aid: number) => {
    try {
      const { error } = await supabase.from('chat_messages').insert({ role, message, attempt_id: aid })
      if (error) console.error('Chat save error:', error.message)
    } catch (e: any) {
      console.error('Chat save failed:', e.message)
    }
  }

  // Load chat history on mount
  useEffect(() => {
    (async () => {
      // Get active attempt
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1
      setAttemptId(aid)

      // Load saved chats
      try {
        const { data: chats, error } = await supabase.from('chat_messages').select('*').eq('attempt_id', aid).order('created_at', { ascending: true })
        if (error) {
          console.error('Chat load error:', error.message)
          // Fallback: try loading without attempt_id filter
          const { data: allChats } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100)
          if (allChats && allChats.length > 0) {
            setMessages(allChats.map((c: any) => ({ role: c.role, content: c.message })))
          } else {
            setMessages([{ role: 'assistant', content: WELCOME }])
            await saveChat('assistant', WELCOME, aid)
          }
        } else if (chats && chats.length > 0) {
          setMessages(chats.map((c: any) => ({ role: c.role, content: c.message })))
        } else {
          setMessages([{ role: 'assistant', content: WELCOME }])
          await saveChat('assistant', WELCOME, aid)
        }
      } catch (e) {
        console.error('Chat load failed:', e)
        setMessages([{ role: 'assistant', content: WELCOME }])
      }
      setLoadingHistory(false)
    })()
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearChats = async () => {
    try {
      await supabase.from('chat_messages').delete().eq('attempt_id', attemptId)
    } catch (e) {
      // Fallback: delete all
      await supabase.from('chat_messages').delete().neq('id', 0)
    }
    const welcomeBack = '🧹 Chats cleared.\n\n' + WELCOME
    setMessages([{ role: 'assistant', content: welcomeBack }])
    await saveChat('assistant', welcomeBack, attemptId)
  }

  const send = async () => {
    if (!input.trim() && !photo) return
    const userContent = input.trim()

    // Check for clear command
    if (userContent.toLowerCase().includes('clear past chats') || userContent.toLowerCase().includes('clear chats')) {
      setInput('')
      await clearChats()
      return
    }

    const userMsg: any = { role: 'user', content: userContent || '📷 Photo uploaded' }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)

    // Save user message to database immediately
    await saveChat('user', userMsg.content, attemptId)

    try {
      const body: any = { messages: [...messages, userMsg], attemptId }

      // If photo, convert to base64
      if (photo) {
        const reader = new FileReader()
        const base64 = await new Promise<string>((res) => {
          reader.onload = () => res((reader.result as string).split(',')[1])
          reader.readAsDataURL(photo)
        })
        body.photo = base64
        body.photoType = photo.type
      }

      const res = await fetch('/api/yogi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      // Save and display assistant response
      const assistantMsg = { role: 'assistant', content: data.reply }
      setMessages(p => [...p, assistantMsg])
      await saveChat('assistant', data.reply, attemptId)

      // If data was saved, show confirmation
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

  const pickPhoto = (file: File | null) => {
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : '')
  }

  if (loadingHistory) return <p style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>Loading chats...</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Yogi</h1>
      <p style={{ fontSize: 13, color: '#8E8E93', marginBottom: 12 }}>Powered by Gemini · {messages.length} messages</p>

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
          {loading && <div style={{ display: 'flex' }}><div className="chat-ai" style={{ color: '#8E8E93' }}>Thinking...</div></div>}
          <div ref={bottom} />
        </div>

        {photoPreview && (
          <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={photoPreview} alt="Upload" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: '#8E8E93', flex: 1 }}>Photo attached</span>
            <button onClick={() => { setPhoto(null); setPhotoPreview('') }} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        <div style={{ padding: 12, borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()} style={{ width: 36, height: 36, borderRadius: 18, background: '#F2F2F7', border: 'none', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => pickPhoto(e.target.files?.[0] || null)} />
          <input className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Talk to Yogi..." />
          <button className="chat-send" onClick={send} disabled={loading} style={{ opacity: loading ? 0.5 : 1 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
