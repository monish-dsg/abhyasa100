import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Refresh token if expired
async function getValidToken() {
  const { data: tokenRow } = await supabase
    .from('whoop_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tokenRow) return null

  const now = new Date()
  const expiresAt = new Date(tokenRow.expires_at)

  // If token is still valid (with 5 min buffer), use it
  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenRow.access_token
  }

  // Token expired — refresh it
  if (!tokenRow.refresh_token) return null

  try {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenRow.refresh_token,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        scope: 'read:sleep read:workout read:recovery read:profile read:body_measurement read:cycles offline',
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Token refresh failed:', data)
      return null
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    await supabase.from('whoop_tokens').update({
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokenRow.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    }).eq('id', tokenRow.id)

    return data.access_token
  } catch (e) {
    console.error('Token refresh error:', e)
    return null
  }
}

// Helper to call Whoop API
async function whoopGet(token: string, path: string, params?: Record<string, string>) {
  const query = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`https://api.prod.whoop.com/developer${path}${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`Whoop API error (${path}):`, err)
    return null
  }
  return res.json()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0]

  const token = await getValidToken()
  if (!token) {
    return NextResponse.json({ error: 'Not connected to Whoop. Please connect first.', connected: false })
  }

  // Set time range for the requested date (full day in UTC)
  const startTime = `${dateParam}T00:00:00.000Z`
  const endTime = `${dateParam}T23:59:59.999Z`

  const result: any = {
    connected: true,
    date: dateParam,
    sleep: null,
    workout: null,
    meditation: null,
    recovery: null,
    steps: null,
  }

  try {
    // 1. Get sleep data
    const sleepData = await whoopGet(token, '/v2/activity/sleep', {
      start: startTime,
      end: endTime,
      limit: '1',
    })

    if (sleepData?.records?.length > 0) {
      const sleep = sleepData.records[0]
      const sleepStart = sleep.start ? new Date(sleep.start) : null
      const sleepEnd = sleep.end ? new Date(sleep.end) : null

      let totalSleepMs = 0
      if (sleep.score?.stage_summary) {
        const s = sleep.score.stage_summary
        totalSleepMs = (s.total_light_sleep_time_milli || 0) +
                       (s.total_slow_wave_sleep_time_milli || 0) +
                       (s.total_rem_sleep_time_milli || 0)
      } else if (sleepStart && sleepEnd) {
        totalSleepMs = sleepEnd.getTime() - sleepStart.getTime()
      }

      const sleepHours = Math.round((totalSleepMs / (1000 * 60 * 60)) * 10) / 10

      result.sleep = {
        sleep_hours: sleepHours,
        sleep_time: sleepStart ? sleepStart.toTimeString().slice(0, 5) : null,
        wake_time: sleepEnd ? sleepEnd.toTimeString().slice(0, 5) : null,
        sleep_score: sleep.score?.sleep_performance_percentage || null,
      }
    }

    // 2. Get workout data
    const workoutData = await whoopGet(token, '/v2/activity/workout', {
      start: startTime,
      end: endTime,
      limit: '10',
    })

    if (workoutData?.records?.length > 0) {
      const workouts = workoutData.records
      let mainWorkout = null
      let meditation = null

      for (const w of workouts) {
        const sportName = (w.sport_id?.toString() || '').toLowerCase()
        const scoreName = (w.score_type || '').toLowerCase()

        // Whoop sport_id 82 = Meditation, also check score_type
        if (w.sport_id === 82 || sportName.includes('meditat') || scoreName.includes('meditat')) {
          const startT = w.start ? new Date(w.start) : null
          const endT = w.end ? new Date(w.end) : null
          const durationMs = (startT && endT) ? endT.getTime() - startT.getTime() : 0
          const durationMins = Math.round(durationMs / (1000 * 60))

          meditation = {
            meditate: true,
            meditate_mins: durationMins,
            meditate_start: startT ? startT.toTimeString().slice(0, 5) : null,
            meditate_end: endT ? endT.toTimeString().slice(0, 5) : null,
          }
        } else if (!mainWorkout) {
          const startT = w.start ? new Date(w.start) : null
          const endT = w.end ? new Date(w.end) : null

          // Map common Whoop sport IDs to names
          const sportNames: Record<number, string> = {
            0: 'Running', 1: 'Cycling', 33: 'Swimming', 43: 'Weightlifting',
            44: 'CrossFit', 45: 'Weightlifting', 48: 'HIIT', 52: 'Yoga',
            63: 'Walking', 71: 'Functional Fitness', 84: 'Pilates',
          }
          const workoutType = sportNames[w.sport_id] || `Workout (${w.sport_id})`

          mainWorkout = {
            workout: true,
            workout_type: workoutType,
          }
        }
      }

      if (mainWorkout) result.workout = mainWorkout
      if (meditation) result.meditation = meditation
    }

    // 3. Get recovery data
    const recoveryData = await whoopGet(token, '/v2/recovery', {
      start: startTime,
      end: endTime,
      limit: '1',
    })

    if (recoveryData?.records?.length > 0) {
      const rec = recoveryData.records[0]
      result.recovery = {
        recovery_score: rec.score?.recovery_score || null,
        hrv: rec.score?.hrv_rmssd_milli ? Math.round(rec.score.hrv_rmssd_milli * 1000) / 1000 : null,
        resting_hr: rec.score?.resting_heart_rate || null,
      }
    }

    // 4. Get cycle data (may include steps)
    const cycleData = await whoopGet(token, '/v2/cycle', {
      start: startTime,
      end: endTime,
      limit: '1',
    })

    if (cycleData?.records?.length > 0) {
      const cycle = cycleData.records[0]
      // Steps may be in the score object or at the top level
      if (cycle.score?.step_count !== undefined) {
        result.steps = cycle.score.step_count
      } else if (cycle.step_count !== undefined) {
        result.steps = cycle.step_count
      }
    }

  } catch (e: any) {
    console.error('Whoop sync error:', e.message)
  }

  return NextResponse.json(result)
}
