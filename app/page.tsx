'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: '🙏 Namaste Monish! I am Yogi — your life, fitness and yoga coach. Rooted in Abhyasa and Vairagya.\n\nTell me about your day — habits completed, steps, sleep, anything — and I\'ll track it automatically. How can I help you today?' }
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

      // Add the reply
      setMessages(p => [...p, { role: 'assistant', content: data.reply }])

      // If data was saved, show a subtle confirmation and refresh logs
      if (data.saved?.success) {
        setMessages(p => [...p, {
          role: 'system',
          content: `📊 Saved Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/10) | Fields: ${data.saved.saved_fields.join(', ')}`
        }])
        // Refresh logs
        const { data: newLogs } = await supabase.from('daily_logs').select('*, habits(*)').order('day')
        if (newLogs) setLogs(newLogs)
      }
    } catch (err: any) {
      setMessages(p => [...p, { role: 'assistant', content: `Error: ${err.message}` }])
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[80vh]">
      <div className="bg-green-900 text-white rounded-2xl p-4 mb-4">
        <h1 className="text-xl font-bold">💬 Yogi — Your AI Coach</h1>
        <p className="text-green-300 text-sm">Powered by Gemini · Rooted in Patanjali · Auto-saves your check-ins</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : m.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            {m.role === 'system' ? (
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-xl text-xs font-medium max-w-sm text-center">
                {m.content}
              </div>
            ) : (
              <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-green-700 text-white' : 'bg-white text-gray-800 shadow'}`}>
                {m.content}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow px-4 py-3 rounded-2xl text-sm text-gray-500 italic">Yogi is thinking... 🧘</div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          placeholder="Tell Yogi about your day..." />
        <button onClick={send} disabled={loading}
          className="bg-green-800 text-white px-5 py-3 rounded-xl font-medium hover:bg-green-700 transition">
          Send
        </button>
      </div>
    </div>
  )
}
