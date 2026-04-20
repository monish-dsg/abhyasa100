'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function YogiChat() {
  const [messages, setMessages] = useState<any[]>([{role:'assistant',content:'🙏 Namaste Monish. I am Yogi — your coach.\n\nTell me about your day and I\'ll track it.'}])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(()=>{supabase.from('daily_logs').select('*, habits(*)').order('day').then(({data})=>{if(data)setLogs(data)})}, [])
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth'})}, [messages])

  const send = async () => {
    if(!input.trim())return; const userMsg={role:'user',content:input}
    setMessages(p=>[...p,userMsg]); setInput(''); setLoading(true)
    const summary = logs.map(l=>`Day ${l.day}: ${l.weight}kg, ${l.color}, ${l.score}/10`).join('\n')
    try {
      const res = await fetch('/api/yogi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...messages,userMsg],summary})})
      const data = await res.json()
      setMessages(p=>[...p,{role:'assistant',content:data.reply}])
      if(data.saved?.success){
        setMessages(p=>[...p,{role:'system',content:`Day ${data.saved.day} → ${data.saved.color} (${data.saved.score}/10)`}])
        const {data:nl} = await supabase.from('daily_logs').select('*, habits(*)').order('day')
        if(nl) setLogs(nl)
      }
    } catch(err:any){setMessages(p=>[...p,{role:'assistant',content:`Error: ${err.message}`}])}
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 100px)' }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em', marginBottom:4 }}>Yogi</h1>
      <p style={{ fontSize:13, color:'#8E8E93', marginBottom:12 }}>Powered by Gemini · Auto-saves</p>

      <div className="card" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {messages.map((m,i) => (
            <div key={i} style={{ display:'flex', justifyContent: m.role==='user'?'flex-end':m.role==='system'?'center':'flex-start', marginBottom:10 }}>
              {m.role==='system' ? (
                <div className="chat-saved">✓ {m.content}</div>
              ) : (
                <div className={m.role==='user' ? 'chat-user' : 'chat-ai'} style={{ whiteSpace:'pre-wrap' }}>{m.content}</div>
              )}
            </div>
          ))}
          {loading && <div style={{display:'flex'}}><div className="chat-ai" style={{color:'#8E8E93'}}>...</div></div>}
          <div ref={bottom}/>
        </div>
        <div style={{ padding:12, borderTop:'0.5px solid rgba(60,60,67,0.12)', display:'flex', gap:8 }}>
          <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Tell Yogi about your day..." />
          <button className="chat-send" onClick={send} disabled={loading} style={{ opacity:loading?0.5:1 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
