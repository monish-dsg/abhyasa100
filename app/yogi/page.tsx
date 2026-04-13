'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([
    { role: 'assistant', content: '🙏 Namaste Monish! I am Yogi — your life, fitness and yoga coach. Rooted in Abhyasa and Vairagya. How can I help you today?' }
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

    const res = await fetch('/api/yogi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, userMsg], summary })
    })
    const data = await res.json()
    setMessages(p => [...p, { role: 'assistant', content: data.reply }])
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[80vh]">
      <div className="bg-green-900 text-white rounded-2xl p-4 mb-4">
        <h1 className="text-xl font-bold">💬 Yogi — Your AI Coach</h1>
        <p className="text-green-300 text-sm">Powered by Claude · Rooted in Patanjali</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-green-700 text-white' : 'bg-white text-gray-800 shadow'}`}>
              {m.content}
            </div>
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
          placeholder="Ask Yogi anything..." />
        <button onClick={send} disabled={loading}
          className="bg-green-800 text-white px-5 py-3 rounded-xl font-medium hover:bg-green-700 transition">
          Send
        </button>
      </div>
    </div>
  )
}
