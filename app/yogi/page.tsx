'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: '🙏 Namaste Monish. I am Yogi — your coach.\n\nTell me about your day and I\'ll track it automatically.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => { supabase.from('daily_logs').select('*, habits(*)').order('day').then(({ data }) => { if (data) setLogs(data) }) }, [])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(p => [...p, userMsg]); setInput(''); setLoading(true)
    const summary = logs.map(l => `Day ${l.day}: ${l.weight}kg, ${l.color}, ${l.score}/10`).join('\n')
    try {
      const res = await fetch('/api/yogi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...messages, userMsg], summary }) })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])
      if (data.saved?.success) {
        setMessages(p => [...p, { role: 'system', content: `Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/10)` }])
        const { data: nl } = await supabase.from('daily_logs').select('*, habits(*)').order('day')
        if (nl) setLogs(nl)
      }
    } catch (err: any) { setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}` }]) }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <p className="section-title" style={{ marginBottom: 6 }}>AI COACH</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Yogi</h1>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Powered by Gemini · Auto-saves check-ins</p>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start', marginBottom: 12 }}>
              {m.role === 'system' ? (
                <div style={{ background: 'rgba(0,209,160,0.1)', border: '1px solid rgba(0,209,160,0.2)', color: '#00D1A0', padding: '5px 14px', borderRadius: 100, fontSize: '0.6875rem', fontWeight: 600 }}>✅ {m.content}</div>
              ) : (
                <div style={{
                  maxWidth: '75%', padding: '12px 16px', fontSize: '0.8125rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  ...(m.role === 'user' ? { background: '#00D1A0', color: '#0B0B0B' } : { background: '#1A1A1A', color: '#fff' })
                }}>{m.content}</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', marginBottom: 12 }}>
              <div style={{ background: '#1A1A1A', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.3)' }}>● ● ●</div>
            </div>
          )}
          <div ref={bottom} />
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Tell Yogi about your day..."
            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', fontSize: '0.8125rem', background: '#141414', color: '#fff', fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={send} disabled={loading} style={{
            background: loading ? '#333' : '#00D1A0', color: '#0B0B0B', border: 'none', borderRadius: 12,
            padding: '12px 20px', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>Send</button>
        </div>
      </div>
    </div>
  )
}
