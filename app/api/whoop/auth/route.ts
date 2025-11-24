import { NextRequest, NextResponse } from 'next/server'

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID
// IMPORTANT: This must match EXACTLY what's registered in your Whoop app settings
// Based on your settings, try: http://localhost:8000/whoop/callback or http://127.0.0.1:3000/api/whoop/callback
const WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/whoop/callback'
const WHOOP_SCOPE = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement'

export async function GET(req: NextRequest) {
  if (!WHOOP_CLIENT_ID) {
    return NextResponse.json({ error: 'Whoop Client ID not configured' }, { status: 500 })
  }

  // Get the exact redirect URI from env or use the origin from the request
  let redirectUri = WHOOP_REDIRECT_URI.trim().replace(/\/$/, '')
  
  // If no explicit redirect URI in env, construct from request origin
  if (!process.env.WHOOP_REDIRECT_URI) {
    const origin = req.nextUrl.origin
    redirectUri = `${origin}/api/whoop/callback`
  }
  
  // Check if this is a popup request
  const isPopup = req.nextUrl.searchParams.get('popup') === 'true'
  
  // Generate state with popup flag encoded
  const stateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  const state = isPopup ? `popup_${stateValue}` : stateValue

  console.log('Whoop Auth - Redirect URI:', redirectUri)
  console.log('Whoop Auth - Client ID:', WHOOP_CLIENT_ID.substring(0, 10) + '...')
  console.log('Whoop Auth - Is popup:', isPopup)
  
  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth')
  authUrl.searchParams.set('client_id', WHOOP_CLIENT_ID)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri) // Keep EXACTLY as registered - no modifications!
  authUrl.searchParams.set('scope', WHOOP_SCOPE)
  authUrl.searchParams.set('state', state)

  const response = NextResponse.redirect(authUrl.toString())
  // Store state with popup flag
  response.cookies.set('whoop_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  
  // Also store popup flag in a separate cookie for easier access
  if (isPopup) {
    response.cookies.set('whoop_auth_popup', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  }

  return response
}

