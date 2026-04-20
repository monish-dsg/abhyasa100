import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Convert UTC date to IST time string (HH:MM)
function toIST(dateStr: string): string {
  const d = new Date(dateStr)
  // IST is UTC + 5:30
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000)
  const ist = new Date(istMs)
  const hh = String(ist.getUTCHours()).padStart(2, '0')
  const mm = String(ist.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

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

  if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
    return tokenRow.access_token
  }

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

  // Set time range for the requested date — use IST boundaries converted to UTC
  // IST midnight = UTC 18:30 previous day
  const startTime = `${dateParam}T00:00:00.000+05:30`
  const endTime = `${dateParam}T23:59:59.999+05:30`

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

      let totalSleepMs = 0
      if (sleep.score?.stage_summary) {
        const s = sleep.score.stage_summary
        totalSleepMs = (s.total_light_sleep_time_milli || 0) +
                       (s.total_slow_wave_sleep_time_milli || 0) +
                       (s.total_rem_sleep_time_milli || 0)
      } else if (sleep.start && sleep.end) {
        totalSleepMs = new Date(sleep.end).getTime() - new Date(sleep.start).getTime()
      }

      const sleepHours = Math.round((totalSleepMs / (1000 * 60 * 60)) * 10) / 10

      result.sleep = {
        sleep_hours: sleepHours,
        sleep_time: sleep.start ? toIST(sleep.start) : null,
        wake_time: sleep.end ? toIST(sleep.end) : null,
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
        // Whoop sport_id 82 = Meditation
        if (w.sport_id === 82) {
          const durationMs = (w.start && w.end) ? new Date(w.end).getTime() - new Date(w.start).getTime() : 0
          const durationMins = Math.round(durationMs / (1000 * 60))

          meditation = {
            meditate: true,
            meditate_mins: durationMins,
            meditate_start: w.start ? toIST(w.start) : null,
            meditate_end: w.end ? toIST(w.end) : null,
          }
        } else if (!mainWorkout) {
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
