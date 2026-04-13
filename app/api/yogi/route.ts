import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { messages, summary } = await req.json()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `You are Yogi, a life, fitness and yoga coach for Monish Shah, 42, vegan CEO of DreamSetGo doing a 100-day discipline challenge called Abhyasa100 rooted in Abhyasa and Vairagya from the Yoga Sutras of Patanjali. Be direct, warm, and hard-edged when needed. Non-negotiables: OMAD, 10k steps, meditation, 6hr sleep, zero content. Best effort: manifest, 3L water, yoga sutras, zero inbox, workout. Here is Monish's journey so far:\n\n${summary}`,
    messages: messages.map((m: any) => ({ role: m.role, content: m.content }))
  })
  return NextResponse.json({ reply: (response.content[0] as any).text })
}
