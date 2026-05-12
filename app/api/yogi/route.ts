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
  description: 'Save habit data. Call when Monish reports any habit, data point, or check-in. Partial saves work. Always call this when he mentions completing or missing any habit.',
  parameters: {
    type: 'object',
    properties: {
      day: { type: 'integer', description: 'Day number (1-100). Defaults to today if not specified.' },
      weight: { type: 'number', description: 'Weight in kg' },
      omad: { type: 'boolean', description: 'OMAD done' },
      full_fast_day: { type: 'boolean', description: 'Full fast day (no food at all)' },
      meal_description: { type: 'string', description: 'What was eaten' },
      steps: { type: 'integer', description: 'Step count' },
      fast_post_4pm: { type: 'boolean', description: 'Fasted after 4pm (no food after 4pm)' },
      meditate: { type: 'boolean', description: 'Meditated' },
      meditate_mins: { type: 'integer', description: 'Meditation minutes' },
      sleep_hours: { type: 'number', description: 'Hours of sleep' },
      zero_content: { type: 'boolean', description: 'Zero content consumption (no social media, no news, no entertainment)' },
      manifest: { type: 'boolean', description: 'Manifestation practice done' },
      water_liters: { type: 'number', description: 'Litres of water consumed' },
      yoga_sutras: { type: 'boolean', description: 'Read Yoga Sutras' },
      zero_inbox: { type: 'boolean', description: 'Inbox zero achieved' },
      workout: { type: 'boolean', description: 'Worked out' },
      workout_type: { type: 'string', description: 'Type of workout (e.g. Swimming, Padel, Gym, Running)' },
      protein_pct: { type: 'number', description: 'Protein percentage of meal' },
      fat_pct: { type: 'number', description: 'Fat percentage of meal' },
      carbs_pct: { type: 'number', description: 'Carbs percentage of meal' },
    }
  }
}

export async function POST(req: Request) {
  try {
    const { messages, attemptId: aid, photo, photoType, startDate: sd } = await req.json()
    const attemptId = aid || 1

    const { data: attempt } = await supabase.from('attempts').select('start_date').eq('attempt_number', attemptId).single()
    const startDate = sd || attempt?.start_date || new Date().toISOString().split('T')[0]
    const dayNum = getDayNumber(startDate)
    const today = new Date().toISOString().split('T')[0]

    // Fetch data directly from database — try with attempt_id, fallback without
    let logs: any[] = []
    let habits: any[] = []
    
    const { data: logsData } = await supabase.from('daily_logs').select('*').eq('attempt_id', attemptId).order('day')
    logs = logsData || []
    
    // If no logs found with attempt_id, try without filter (data might have default attempt_id)
    if (logs.length === 0) {
      const { data: allLogs } = await supabase.from('daily_logs').select('*').order('day')
      logs = allLogs || []
    }

    const { data: habitsData } = await supabase.from('habits').select('*').eq('attempt_id', attemptId).order('day')
    habits = habitsData || []
    
    // If no habits found with attempt_id, try without filter
    if (habits.length === 0) {
      const { data: allHabits } = await supabase.from('habits').select('*').order('day')
      habits = allHabits || []
    }

    // Build detailed summary from database
    const summary = logs.map((l: any) => {
      const h = habits.find((hab: any) => hab.day === l.day)
      return `Day ${l.day} (${l.date}): Weight ${l.weight || '?'}kg, Color: ${l.color || 'unscored'}, Score: ${l.score || 0}/11` +
        (h ? `
  OMAD: ${h.omad ? 'YES' : 'NO'}
  Full Fast Day: ${h.full_fast_day ? 'YES' : 'NO'}
  Steps: ${h.steps || 0}
  Fast Post 4pm: ${h.fast_post_4pm ? 'YES' : 'NO'}
  Meditate: ${h.meditate ? 'YES' : 'NO'} (${h.meditate_mins || 0} mins)
  Sleep: ${h.sleep_hours || '?'} hours
  Zero Content: ${h.zero_content ? 'YES' : 'NO'}
  Manifest: ${h.manifest ? 'YES' : 'NO'}
  Water: ${h.water_liters || 0}L
  Workout: ${h.workout ? 'YES' : 'NO'} ${h.workout_type ? '(' + h.workout_type + ')' : ''}
  Zero Inbox: ${h.zero_inbox ? 'YES' : 'NO'}
  Yoga Sutras: ${h.yoga_sutras ? 'YES' : 'NO'}
  Meal: ${h.meal_description || 'not logged'}
  Macros: Protein ${h.protein_pct || '?'}% / Fat ${h.fat_pct || '?'}% / Carbs ${h.carbs_pct || '?'}%` : '\n  No habit details logged for this day')
    }).join('\n\n')

    // Calculate stats for Yogi
    const totalDays = logs.length
    const perfectDays = logs.filter((l: any) => l.color === 'Perfect').length
    const solidDays = logs.filter((l: any) => l.color === 'Solid').length
    const slippedDays = logs.filter((l: any) => l.color === 'Slipped').length
    const missedDays = logs.filter((l: any) => l.color === 'Missed').length
    const weights = logs.filter((l: any) => l.weight > 0).map((l: any) => ({ day: l.day, weight: l.weight }))
    const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null
    const startWeight = weights.length > 0 ? weights[0].weight : null

    const statsBlock = `
STATISTICS:
- Days logged: ${totalDays}/100 (Day ${dayNum} today)
- Perfect: ${perfectDays} | Solid: ${solidDays} | Slipped: ${slippedDays} | Missed: ${missedDays}
- Start weight: ${startWeight || 'not logged'}kg | Current weight: ${latestWeight || 'not logged'}kg | Target: 66kg
- Weight lost: ${startWeight && latestWeight ? (startWeight - latestWeight).toFixed(1) : '?'}kg
${weights.length >= 2 ? `- Weight trend: ${weights.map(w => `D${w.day}:${w.weight}`).join(' → ')}` : ''}
- Habits records found: ${habits.length}
- Daily logs found: ${logs.length}`

    // Calculate target date
    const endDate = new Date(startDate + 'T00:00:00')
    endDate.setDate(endDate.getDate() + 99)
    const daysLeft = 100 - dayNum + 1

    const systemInstruction = `You are Yogi, an elite AI life, fitness and yoga coach for Monish Shah. He is 42, vegan, CEO of DreamSetGo, doing a 100-day discipline challenge called Abhyasa100 rooted in Abhyasa (practice) and Vairagya (desirelessness) from Patanjali's Yoga Sutras.

CURRENT STATE:
- Attempt ${attemptId}, Day ${dayNum} of 100 (${today})
- Started: ${startDate} | Ends: ${endDate.toISOString().split('T')[0]}
- Days left: ${daysLeft}

HABIT STRUCTURE:
Must-Have's (3): OMAD (or full fast day), 10,000+ steps, Fast post 4pm (no food after 4pm)
Bonus (8): Meditate, Sleep 6+hrs, Zero content, Manifest, Water 3+L, Workout, Zero inbox, Yoga Sutras

SCORING: Perfect (all 11) | Solid (3 must-haves done) | Slipped (2+ must-haves missed) | Missed (nothing logged)

YOUR CAPABILITIES — use these actively:

1. SAVE HABITS: When Monish tells you about ANY habit completion, data point, food, steps, sleep — IMMEDIATELY call save_habits. Don't just acknowledge, SAVE IT.

2. WEEKLY REVIEW: When asked "how was my week" or similar, analyze the last 7 days from the data below. Count Perfect/Solid/Slipped/Missed days. Highlight wins and call out failures. Be specific with numbers.

3. STREAK TRACKING: Calculate longest consecutive Solid/Perfect days. Tell him his current streak and record streak.

4. MEAL PLANNING: When asked, design specific vegan OMAD meals with approximate macros. He needs high protein vegan meals. Be creative and specific (exact ingredients, portions).

5. ACCOUNTABILITY: If it's past 4pm and key habits aren't logged, point it out. If he's been quiet for days, call it out. Don't be soft.

6. YOGA SUTRA OF THE DAY: When asked, share a relevant sutra from Patanjali with the sutra number and brief commentary connecting it to his current challenge state.

7. PROGRESS COMPARISON: If asked about comparing attempts, analyze Attempt 1 vs current attempt.

8. WEIGHT PREDICTION: Based on weight trend in the data, calculate rate of loss and predict when he'll hit 66kg target.

9. SLEEP COACHING: If he mentions poor sleep or you see declining sleep hours, give specific evidence-based sleep advice.

10. MOTIVATION: When he's struggling, draw from Patanjali's teachings. Reference specific sutras. Remind him why he started. Be the coach he needs — warm but HARD. Don't let him off easy.

11. FOOD PHOTO ANALYSIS: When he uploads a food photo, analyze it thoroughly. Break down into Protein %, Fat %, Carbs %. Estimate calories. Then SAVE the macros using save_habits.

12. WORKOUT RECOMMENDATIONS: When asked, give specific workout routines. He has access to gym, swimming, padel, and walking. Tailor to his fitness level (intermediate).

PERSONALITY:
- Direct, warm, but TOUGH when habits are missed
- Use data and numbers, not vague encouragement
- Reference Patanjali's Yoga Sutras when relevant
- Celebrate wins genuinely but briefly — then push for more
- If he's making excuses, call them out
- You are his accountability partner, not his friend

CRITICAL: ALWAYS call save_habits when he reports ANY data. Even partial data. Even one habit.

JOURNEY DATA:
${statsBlock}

DAILY LOG:
${summary || 'No data logged yet. Day 1 starts now.'}

THE PERFECT DAY (his ideal schedule):
4:15am-5:00am: Manifest, Yoga Sutras, 1L water
5:00am-6:30am: Walk & Meditate
6:30am-7:30am: Kids Time
7:30am-9:30am: Gym or Padel
9:30am-2:00pm: DreamSetGo work
2:00pm-2:30pm: Lunch (OMAD)
2:30pm-8:00pm: DreamSetGo work
8:00pm-10:00pm: Kids Time
10:00pm: Sleep`

    // Build Gemini messages — use last 20 messages for better context
    const geminiMessages = messages.slice(-20).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: m.role === 'system' ? [{ text: `[System: ${m.content}]` }] : [{ text: m.content }]
    })).filter((m: any) => m.parts[0].text)

    // If photo is included, add it to the last user message
    if (photo && geminiMessages.length > 0) {
      const lastMsg = geminiMessages[geminiMessages.length - 1]
      if (lastMsg.role === 'user') {
        lastMsg.parts = [
          { inline_data: { mime_type: photoType || 'image/jpeg', data: photo } },
          { text: (lastMsg.parts[0].text || '') + '\n\nAnalyze this food photo. Break down macros: Protein %, Fat %, Carbs %. Estimate total calories. Then save the data using save_habits.' }
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
