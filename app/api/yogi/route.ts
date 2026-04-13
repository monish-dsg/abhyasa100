import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const { messages, summary } = await req.json()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: `You are Yogi, a life, fitness and yoga coach for Monish Shah, 42, vegan CEO of DreamSetGo doing a 100-day discipline challenge called Abhyasa100 rooted in Abhyasa and Vairagya from the Yoga Sutras of Patanjali. Be direct and warm. Non-negotiables: OMAD, 10k steps, meditation, 6hr sleep, zero content. Best effort: manifest, 3L water, yoga sutras, zero inbox, workout. Journey so far:\n\n${summary}`,
      messages: messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content }))
    })
    return NextResponse.json({ reply: (response.content[0] as any).text })
  } catch (e: any) {
    return NextResponse.json({ reply: 'Yogi is unavailable right now. Please try again! 🙏' })
  }
}
