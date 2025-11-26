import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
// IMPORTANT: This must match EXACTLY what's registered in your Spotify app settings
// Common options: http://localhost:3000/api/spotify/callback or http://127.0.0.1:3000/api/spotify/callback
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback'
const SPOTIFY_SCOPE = 'playlist-read-private user-modify-playback-state streaming user-read-playback-state'

export async function GET(req: NextRequest) {
  if (!SPOTIFY_CLIENT_ID) {
    console.error('Spotify Client ID not configured')
    return NextResponse.json({ error: 'Spotify Client ID not configured' }, { status: 500 })
  }

  // Get the exact redirect URI - construct from request origin if not in env
  let redirectUri = SPOTIFY_REDIRECT_URI.trim().replace(/\/$/, '')
  
  // If no explicit redirect URI in env, construct from request origin
  if (!process.env.SPOTIFY_REDIRECT_URI) {
    const origin = req.nextUrl.origin
    redirectUri = `${origin}/api/spotify/callback`
  }
  
  console.log('Spotify Auth - Redirect URI:', redirectUri)
  console.log('Spotify Auth - Client ID:', SPOTIFY_CLIENT_ID.substring(0, 10) + '...')
  
  // Generate random state for security
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Build authorization URL - use URLSearchParams for proper encoding
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri, // Must match exactly what's in Spotify dashboard
    scope: SPOTIFY_SCOPE,
    state: state,
  })
  
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
  
  console.log('Spotify Auth URL (redirect_uri hidden):', authUrl.replace(redirectUri, 'REDIRECT_URI_HIDDEN').replace(SPOTIFY_CLIENT_ID, 'CLIENT_ID_HIDDEN'))
  
  // Store state in a cookie (in production, use a more secure method)
  const response = NextResponse.redirect(authUrl)
  
  response.cookies.set('spotify_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
    domain: undefined, // Let browser set domain automatically
  })
  
  console.log('Spotify Auth - State stored:', state, '(cookie will be set for', req.nextUrl.hostname, ')')

  return response
}

