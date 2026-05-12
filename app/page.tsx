'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

const WELCOME = '🙏 Namaste Monish. I am Yogi — your AI coach.\n\nI can track habits, analyze food photos, recommend workouts, review your week, predict your weight goal, coach you through tough days with Patanjali\'s wisdom, and much more.\n\nJust talk to me. Say "clear past chats" to start fresh.'

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

  // Load chat history on mount
  useEffect(() => {
    (async () => {
      const { data: att } = await supabase.from('attempts').select('*').eq('status', 'active').order('attempt_number', { ascending: false }).limit(1)
      const aid = att?.[0]?.attempt_number || 1
      setAttemptId(aid)

      // Load saved chats
      const { data: chats } = await supabase.from('chat_messages').select('*').eq('attempt_id', aid).order('created_at', { ascending: true })
      if (chats && chats.length > 0) {
        const loaded = chats.map((c: any) => ({ role: c.role, content: c.message }))
        setMessages(loaded)
      } else {
        setMessages([{ role: 'assistant', content: WELCOME }])
      }
      setLoadingHistory(false)
    })()
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const clearChats = async () => {
    await supabase.from('chat_messages').delete().eq('attempt_id', attemptId)
    setMessages([{ role: 'assistant', content: '🧹 Chats cleared.\n\n' + WELCOME }])
    // Save the welcome message
    await supabase.from('chat_messages').insert({ role: 'assistant', message: '🧹 Chats cleared.\n\n' + WELCOME, attempt_id: attemptId })
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

    // Save user message to database
    await supabase.from('chat_messages').insert({ role: 'user', message: userMsg.content, attempt_id: attemptId, food_photo_url: photo ? 'attached' : null })

    try {
      // Get context
      const { data: logs } = await supabase.from('daily_logs').select('*').eq('attempt_id', attemptId).order('day')
      const { data: habits } = await supabase.from('habits').select('*').eq('attempt_id', attemptId).order('day')
      const { data: attempt } = await supabase.from('attempts').select('*').eq('attempt_number', attemptId).single()

      const summary = (logs || []).map((l: any) => {
        const h = (habits || []).find((hab: any) => hab.day === l.day)
        return `Day ${l.day} (${l.date}): ${l.weight || '?'}kg, ${l.color || '?'}, ${l.score || 0}/11${h ? ` | OMAD:${h.omad?'Y':'N'} Steps:${h.steps||0} Fast4pm:${h.fast_post_4pm?'Y':'N'} Med:${h.meditate?'Y':'N'} Sleep:${h.sleep_hours||'?'}h Water:${h.water_liters||'?'}L Workout:${h.workout?'Y':'N'}` : ''}`
      }).join('\n')

      const body: any = { messages: [...messages, userMsg], summary, attemptId, startDate: attempt?.start_date }

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

      const assistantMsg = { role: 'assistant', content: data.reply }
      setMessages(p => [...p, assistantMsg])

      // Save assistant message to database
      await supabase.from('chat_messages').insert({ role: 'assistant', message: data.reply, attempt_id: attemptId, macro_data: data.macros || null })

      if (data.saved?.success) {
        const sysMsg = { role: 'system', content: `Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/11)` }
        setMessages(p => [...p, sysMsg])
        await supabase.from('chat_messages').insert({ role: 'system', message: sysMsg.content, attempt_id: attemptId })
      }

    } catch (err: any) {
      const errMsg = { role: 'assistant', content: `Error: ${err.message}` }
      setMessages(p => [...p, errMsg])
      await supabase.from('chat_messages').insert({ role: 'assistant', message: errMsg.content, attempt_id: attemptId })
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

        {/* Photo preview */}
        {photoPreview && (
          <div style={{ padding: '8px 16px', borderTop: '0.5px solid rgba(60,60,67,0.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={photoPreview} alt="Upload" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ fontSize: 13, color: '#8E8E93', flex: 1 }}>Photo attached</span>
            <button onClick={() => { setPhoto(null); setPhotoPreview('') }} style={{ background: 'none', border: 'none', color: '#FF3B30', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
          </div>
        )}

        {/* Input */}
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
