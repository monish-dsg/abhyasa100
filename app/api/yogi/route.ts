import { NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, summary } = await req.json()
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `You are Yogi, a life, fitness and yoga coach for Monish Shah, 42, vegan CEO of DreamSetGo doing a 100-day discipline challenge called Abhyasa100 rooted in Abhyasa and Vairagya from the Yoga Sutras of Patanjali. Be direct and warm. Non-negotiables: OMAD, 10k steps, meditation, 6hr sleep, zero content. Best effort: manifest, 3L water, yoga sutras, zero inbox, workout. Journey so far:\n\n${summary}`,
        messages: messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }))
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json({ reply: `Error: ${JSON.stringify(data)}` })
    }

    return NextResponse.json({ reply: data.content[0].text })
  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` })
  }
}
