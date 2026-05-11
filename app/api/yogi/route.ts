import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

function getDayNumber(startDate: string): number {
  return Math.max(1, Math.floor((new Date().getTime() - new Date(startDate + 'T00:00:00').getTime()) / 864e5) + 1)
}

function getColor(h: any) {
  const mustHaves = [h.omad || h.full_fast_day, (h.steps || 0) >= 10000, h.fast_post_4pm]
  const missedMust = mustHaves.filter((v: boolean) => !v).length
  const bonus = [h.meditate, (h.sleep_hours || 0) >= 6, h.zero_content, h.manifest, (h.water_liters || 0) >= 3, h.workout, h.zero_inbox, h.yoga_sutras]
  const bonusDone = bonus.filter(Boolean).length
  if (missedMust === 0 && bonusDone === 8) return { color: 'Perfect', score: 11 }
  if (missedMust === 0) return { color: 'Solid', score: 3 + bonusDone }
  if (missedMust >= 2) return { color: 'Slipped', score: Math.max(0, 3 - missedMust) + bonusDone }
  return { color: 'Solid', score: 2 + bonusDone }
}

async function saveHabits(params: any, attemptId: number) {
  const { data: attempt } = await supabase.from('attempts').select('start_date').eq('attempt_number', attemptId).single()
  const startDate = attempt?.start_date || new Date().toISOString().split('T')[0]
  const day = params.day || getDayNumber(startDate)
  const date = params.date || new Date().toISOString().split('T')[0]

  await supabase.from('daily_logs').upsert({ day, date, attempt_id: attemptId, weight: params.weight || 0 }, { onConflict: 'day,attempt_id' } as any)

  const { data: existing } = await supabase.from('habits').select('*').eq('day', day).eq('attempt_id', attemptId).single()
  const habitData: any = { day, attempt_id: attemptId, ...existing }

  const fields = ['omad', 'full_fast_day', 'steps', 'fast_post_4pm', 'meditate', 'meditate_mins', 'sleep_hours', 'sleep_time', 'wake_time', 'zero_content', 'manifest', 'water_liters', 'yoga_sutras', 'zero_inbox', 'workout', 'workout_type', 'meal_description', 'protein_pct', 'fat_pct', 'carbs_pct']
  fields.forEach(f => { if (params[f] !== undefined) habitData[f] = params[f] })

  await supabase.from('habits').upsert(habitData, { onConflict: 'day,attempt_id' } as any)

  const { data: h } = await supabase.from('habits').select('*').eq('day', day).eq('attempt_id', attemptId).single()
  const { color, score } = getColor(h || {})
  await supabase.from('daily_logs').update({ color, score }).eq('day', day).eq('attempt_id', attemptId)

  return { success: true, day, color, score, saved_fields: Object.keys(params).filter(k => k !== 'day' && k !== 'date') }
}

const saveHabitsTool = {
  name: 'save_habits',
  description: 'Save habit data. Call when Monish reports any habit, data point, or check-in. Partial saves work.',
  parameters: {
    type: 'object',
    properties: {
      day: { type: 'integer', description: 'Day number (1-100)' },
      weight: { type: 'number', description: 'Weight in kg' },
      omad: { type: 'boolean', description: 'OMAD done' },
      full_fast_day: { type: 'boolean', description: 'Full fast day (no food)' },
      meal_description: { type: 'string', description: 'What was eaten' },
      steps: { type: 'integer', description: 'Step count' },
      fast_post_4pm: { type: 'boolean', description: 'Fasted after 4pm' },
      meditate: { type: 'boolean', description: 'Meditated' },
      meditate_mins: { type: 'integer', description: 'Meditation minutes' },
      sleep_hours: { type: 'number', description: 'Hours of sleep' },
      zero_content: { type: 'boolean', description: 'Zero content consumption' },
      manifest: { type: 'boolean', description: 'Manifestation done' },
      water_liters: { type: 'number', description: 'Litres of water' },
      yoga_sutras: { type: 'boolean', description: 'Read Yoga Sutras' },
      zero_inbox: { type: 'boolean', description: 'Inbox zero achieved' },
      workout: { type: 'boolean', description: 'Worked out' },
      workout_type: { type: 'string', description: 'Type of workout' },
      protein_pct: { type: 'number', description: 'Protein percentage of meal' },
      fat_pct: { type: 'number', description: 'Fat percentage of meal' },
      carbs_pct: { type: 'number', description: 'Carbs percentage of meal' },
    }
  }
}

export async function POST(req: Request) {
  try {
    const { messages, summary, attemptId: aid, photo, photoType } = await req.json()
    const attemptId = aid || 1

    const { data: attempt } = await supabase.from('attempts').select('start_date').eq('attempt_number', attemptId).single()
    const startDate = attempt?.start_date || '2026-05-12'
    const dayNum = getDayNumber(startDate)

    const systemInstruction = `You are Yogi, Monish Shah's AI life, fitness and yoga coach. He is 42, vegan CEO of DreamSetGo, doing a 100-day discipline challenge called Abhyasa100.

Attempt ${attemptId}. Today is Day ${dayNum} (${new Date().toISOString().split('T')[0]}).

Must-Have habits (3): OMAD (or full fast day), 10k steps, Fast post 4pm
Bonus habits (8): Meditate, Sleep 6h, Zero content, Manifest, Water 3L, Workout, Zero inbox, Yoga Sutras

CRITICAL: When Monish tells you about ANY habit, save it immediately using save_habits.
When he uploads a food photo, analyze the macros (protein %, fat %, carbs %) and save them.
When he asks for workout recommendations, give specific exercises.
When he asks about his data, analyze from the summary below.
Be direct, warm, and TOUGH when habits are missed.

Journey so far:\n${summary || 'No data yet'}`

    // Build Gemini messages
    const geminiMessages = messages.slice(-12).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: m.role === 'system' ? [{ text: m.content }] : [{ text: m.content }]
    }))

    // If photo is included, add it to the last user message
    if (photo && geminiMessages.length > 0) {
      const lastMsg = geminiMessages[geminiMessages.length - 1]
      if (lastMsg.role === 'user') {
        lastMsg.parts = [
          { inline_data: { mime_type: photoType || 'image/jpeg', data: photo } },
          { text: lastMsg.parts[0].text + '\n\nPlease analyze this food photo and break down the macros (Protein %, Fat %, Carbs %). Then save the data.' }
        ]
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: geminiMessages,
          tools: [{ function_declarations: [saveHabitsTool] }],
        })
      }
    )

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ reply: `Error from Gemini: ${JSON.stringify(data)}` })

    const candidate = data.candidates?.[0]
    if (!candidate) return NextResponse.json({ reply: 'No response from Yogi.' })

    const parts = candidate.content?.parts || []
    const functionCall = parts.find((p: any) => p.functionCall)
    const textPart = parts.find((p: any) => p.text)

    if (functionCall && functionCall.functionCall.name === 'save_habits') {
      const savedResult = await saveHabits(functionCall.functionCall.args, attemptId)

      const followUp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [
              ...geminiMessages,
              candidate.content,
              { role: 'user', parts: [{ functionResponse: { name: 'save_habits', response: savedResult } }] }
            ],
            tools: [{ function_declarations: [saveHabitsTool] }],
          })
        }
      )

      const followUpData = await followUp.json()
      const followUpText = followUpData.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text

      return NextResponse.json({
        reply: followUpText || `✅ Saved Day ${savedResult.day} (${savedResult.color}, ${savedResult.score}/11)`,
        saved: savedResult,
        macros: functionCall.functionCall.args.protein_pct ? { protein: functionCall.functionCall.args.protein_pct, fat: functionCall.functionCall.args.fat_pct, carbs: functionCall.functionCall.args.carbs_pct } : null
      })
    }

    return NextResponse.json({ reply: textPart?.text || 'Yogi has nothing to say.', saved: null })

  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` })
  }
}
