import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || state !== 'abhyasa100') {
    return NextResponse.redirect('https://abhyasa100.vercel.app/?whoop=error')
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://abhyasa100.vercel.app'}/api/whoop/callback`

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.WHOOP_CLIENT_ID!,
        client_secret: process.env.WHOOP_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      console.error('Whoop token error:', tokenData)
      return NextResponse.redirect('https://abhyasa100.vercel.app/?whoop=error')
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Delete any old tokens and store the new one
    await supabase.from('whoop_tokens').delete().neq('id', 0)
    await supabase.from('whoop_tokens').insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })

    return NextResponse.redirect('https://abhyasa100.vercel.app/?whoop=connected')
  } catch (e: any) {
    console.error('Whoop callback error:', e.message)
    return NextResponse.redirect('https://abhyasa100.vercel.app/?whoop=error')
  }
}
