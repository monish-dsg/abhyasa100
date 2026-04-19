import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Calculate color and score from habit data
function getColor(d: any) {
  const nonNeg = [d.omad, d.steps >= 10000, d.meditate, d.sleep_hours >= 6, d.zero_content]
  const missed = nonNeg.filter((v: boolean) => v === false).length
  const bonus = [d.manifest, d.water_liters >= 3, d.yoga_sutras, d.zero_inbox, d.workout]
  const bonusDone = bonus.filter(Boolean).length
  if (missed === 0 && bonusDone === 5) return { color: 'Dark Green', score: 10 }
  if (missed === 0) return { color: 'Green', score: 5 + bonusDone }
  if (missed === 1) return { color: 'Orange', score: 4 + bonusDone }
  return { color: 'Red', score: nonNeg.filter(Boolean).length + bonusDone }
}

// Calculate the day number from the challenge start date
function getDayNumber(dateStr?: string): number {
  const startDate = new Date('2026-04-20')
  const target = dateStr ? new Date(dateStr) : new Date()
  const diff = Math.floor((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  return diff + 1 // Day 1 = April 20
}

// Save habits to Supabase
async function saveHabits(params: any) {
  const day = params.day || getDayNumber()
  const date = params.date || new Date().toISOString().split('T')[0]

  const habitData: any = { day }
  if (params.omad !== undefined) habitData.omad = params.omad
  if (params.steps !== undefined) habitData.steps = Number(params.steps)
  if (params.meditate !== undefined) habitData.meditate = params.meditate
  if (params.meditate_mins !== undefined) habitData.meditate_mins = Number(params.meditate_mins)
  if (params.sleep_hours !== undefined) habitData.sleep_hours = Number(params.sleep_hours)
  if (params.sleep_time !== undefined) habitData.sleep_time = params.sleep_time
  if (params.wake_time !== undefined) habitData.wake_time = params.wake_time
  if (params.zero_content !== undefined) habitData.zero_content = params.zero_content
  if (params.manifest !== undefined) habitData.manifest = params.manifest
  if (params.water_liters !== undefined) habitData.water_liters = Number(params.water_liters)
  if (params.yoga_sutras !== undefined) habitData.yoga_sutras = params.yoga_sutras
  if (params.zero_inbox !== undefined) habitData.zero_inbox = params.zero_inbox
  if (params.workout !== undefined) habitData.workout = params.workout
  if (params.workout_type !== undefined) habitData.workout_type = params.workout_type
  if (params.meal_description !== undefined) habitData.meal_description = params.meal_description

  // First, get existing data for this day (so we can merge partial updates)
  const { data: existing } = await supabase.from('habits').select('*').eq('day', day).single()

  const merged = { ...existing, ...habitData }

  // Save habits
  const { error: habitError } = await supabase.from('habits').upsert(merged, { onConflict: 'day' })

  // Calculate color & score from merged data
  const { color, score } = getColor({
    omad: merged.omad ?? false,
    steps: merged.steps ?? 0,
    meditate: merged.meditate ?? false,
    sleep_hours: merged.sleep_hours ?? 0,
    zero_content: merged.zero_content ?? false,
    manifest: merged.manifest ?? false,
    water_liters: merged.water_liters ?? 0,
    yoga_sutras: merged.yoga_sutras ?? false,
    zero_inbox: merged.zero_inbox ?? false,
    workout: merged.workout ?? false,
  })

  // Save daily log
  const logData: any = { day, date, color, score }
  if (params.weight !== undefined) logData.weight = Number(params.weight)
  if (params.notes !== undefined) logData.notes = params.notes

  const { error: logError } = await supabase.from('daily_logs').upsert(logData, { onConflict: 'day' })

  return {
    success: !habitError && !logError,
    day,
    color,
    score,
    saved_fields: Object.keys(habitData).filter(k => k !== 'day'),
    error: habitError?.message || logError?.message || null
  }
}

// Gemini function declaration for save_habits
const saveHabitsTool = {
  name: 'save_habits',
  description: 'Save or update habit check-in data for a specific day. Call this whenever Monish reports completing or missing any habit, or shares any trackable data like steps, sleep, water, weight, etc. You can save partial data — you don\'t need all fields at once. The data merges with any existing data for that day.',
  parameters: {
    type: 'object',
    properties: {
      day: { type: 'integer', description: 'Day number of the challenge (1-100). If not specified, defaults to today.' },
      date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' },
      weight: { type: 'number', description: 'Morning weight in kg' },
      omad: { type: 'boolean', description: 'Whether OMAD (one meal a day) was followed' },
      meal_description: { type: 'string', description: 'What the meal consisted of' },
      steps: { type: 'integer', description: 'Step count for the day' },
      meditate: { type: 'boolean', description: 'Whether meditation was done' },
      meditate_mins: { type: 'integer', description: 'Minutes of meditation' },
      sleep_hours: { type: 'number', description: 'Hours of sleep' },
      sleep_time: { type: 'string', description: 'Bedtime in HH:MM format' },
      wake_time: { type: 'string', description: 'Wake time in HH:MM format' },
      zero_content: { type: 'boolean', description: 'Whether zero content consumption was maintained' },
      manifest: { type: 'boolean', description: 'Whether manifestation practice was done' },
      water_liters: { type: 'number', description: 'Liters of water consumed' },
      yoga_sutras: { type: 'boolean', description: 'Whether Yoga Sutras were read' },
      zero_inbox: { type: 'boolean', description: 'Whether inbox zero was achieved' },
      workout: { type: 'boolean', description: 'Whether a workout was done' },
      workout_type: { type: 'string', description: 'Type of workout (e.g., swimming, running, gym)' },
      notes: { type: 'string', description: 'Any additional notes for the day' },
    },
    required: []
  }
}

export async function POST(req: Request) {
  try {
    const { messages, summary } = await req.json()

    const systemInstruction = `You are Yogi, a life, fitness and yoga coach for Monish Shah, 42, vegan CEO of DreamSetGo doing a 100-day discipline challenge called Abhyasa100 rooted in Abhyasa and Vairagya from the Yoga Sutras of Patanjali.

The challenge started on April 20, 2026. Today is ${new Date().toISOString().split('T')[0]}, which is Day ${getDayNumber()}.

Be direct, warm, and TOUGH when habits are missed. You are his accountability coach — not his friend.

Non-negotiables (5): OMAD, 10k steps, meditation, 6hr sleep, zero content consumption
Best-effort (5): manifestation, 3L water, yoga sutras reading, zero inbox, workout

IMPORTANT: Whenever Monish tells you about any habit completion, data point (steps, sleep, water, weight, etc.), or check-in — use the save_habits function to record it immediately. You can save partial data. If he says "I did 12000 steps today and meditated for 20 mins", save steps=12000, meditate=true, meditate_mins=20.

If he mentions a specific day number, use that day. Otherwise default to today (Day ${getDayNumber()}).

Journey so far:
${summary}`

    // Build Gemini messages format
    const geminiMessages = messages.slice(-10).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

    // First call to Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

    if (!response.ok) {
      return NextResponse.json({ reply: `Error from Gemini: ${JSON.stringify(data)}` })
    }

    const candidate = data.candidates?.[0]
    if (!candidate) {
      return NextResponse.json({ reply: 'No response from Yogi. Try again.' })
    }

    // Check if Gemini wants to call save_habits
    const parts = candidate.content?.parts || []
    const functionCall = parts.find((p: any) => p.functionCall)
    const textPart = parts.find((p: any) => p.text)

    let savedResult = null

    if (functionCall && functionCall.functionCall.name === 'save_habits') {
      // Execute the function
      savedResult = await saveHabits(functionCall.functionCall.args)

      // Send function result back to Gemini for final response
      const followUp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [
              ...geminiMessages,
              candidate.content,
              {
                role: 'user',
                parts: [{
                  functionResponse: {
                    name: 'save_habits',
                    response: savedResult
                  }
                }]
              }
            ],
            tools: [{ function_declarations: [saveHabitsTool] }],
          })
        }
      )

      const followUpData = await followUp.json()
      const followUpText = followUpData.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text

      return NextResponse.json({
        reply: followUpText || `✅ Saved Day ${savedResult.day} data (${savedResult.color}, ${savedResult.score}/10)`,
        saved: savedResult
      })
    }

    // No function call — just a regular text response
    return NextResponse.json({
      reply: textPart?.text || 'Yogi has nothing to say. That means you should be doing your habits.',
      saved: null
    })

  } catch (e: any) {
    return NextResponse.json({ reply: `Error: ${e.message}` })
  }
}
