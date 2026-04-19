'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: '🙏 Namaste Monish. I am Yogi — your coach.\n\nTell me about your day — habits, steps, sleep, anything — and I\'ll track it automatically.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('daily_logs').select('*, habits(*)').order('day').then(({ data }) => { if (data) setLogs(data) })
  }, [])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)

    const summary = logs.map(l => `Day ${l.day}: Weight ${l.weight}kg, Color: ${l.color}, Score: ${l.score}/10`).join('\n')

    try {
      const res = await fetch('/api/yogi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], summary })
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])

      if (data.saved?.success) {
        setMessages(p => [...p, {
          role: 'system',
          content: `Saved Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/10)`
        }])
        const { data: newLogs } = await supabase.from('daily_logs').select('*, habits(*)').order('day')
        if (newLogs) setLogs(newLogs)
      }
    } catch (err: any) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}` }])
    }

    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p className="section-title" style={{ marginBottom: 6 }}>AI COACH</p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>Yogi</h1>
        <p style={{ fontSize: '0.8125rem', color: '#86868b', marginTop: 4 }}>Powered by Gemini · Auto-saves your check-ins</p>
      </div>

      {/* Chat area */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 10px 20px' }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : m.role === 'system' ? 'center' : 'flex-start',
              marginBottom: 12,
            }}>
              {m.role === 'system' ? (
                <div style={{
                  background: 'rgba(45,106,79,0.08)',
                  border: '1px solid rgba(45,106,79,0.15)',
                  color: '#2d6a4f',
                  padding: '6px 14px',
                  borderRadius: 100,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  ✅ {m.content}
                </div>
              ) : (
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  ...(m.role === 'user' ? {
                    background: '#2d6a4f',
                    color: 'white',
                  } : {
                    background: '#f0f0f0',
                    color: '#1d1d1f',
                  })
                }}>
                  {m.content}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                background: '#f0f0f0',
                padding: '12px 16px',
                borderRadius: '18px 18px 18px 4px',
                fontSize: '0.875rem',
                color: '#86868b',
              }}>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <span style={{ animation: 'fadeIn 1s infinite' }}>●</span>
                  <span style={{ animation: 'fadeIn 1s infinite 0.2s' }}>●</span>
                  <span style={{ animation: 'fadeIn 1s infinite 0.4s' }}>●</span>
                </span>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Tell Yogi about your day..."
            style={{
              flex: 1,
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: '0.875rem',
              background: '#fafafa',
              outline: 'none',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = '#2d6a4f'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <button
            onClick={send}
            disabled={loading}
            style={{
              background: loading ? '#c7c7cc' : '#2d6a4f',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              padding: '12px 20px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
