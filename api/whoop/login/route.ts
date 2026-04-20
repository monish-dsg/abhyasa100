import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.WHOOP_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://abhyasa100.vercel.app'}/api/whoop/callback`
  const scopes = 'read:sleep read:workout read:recovery read:profile read:body_measurement read:cycles offline'

  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
    `response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=abhyasa100`

  return NextResponse.redirect(authUrl)
}
