import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET
// IMPORTANT: This must match EXACTLY what's registered in your Spotify app settings
const SPOTIFY_REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/spotify/callback'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const storedState = req.cookies.get('spotify_auth_state')?.value
  const error = req.nextUrl.searchParams.get('error')

  const buildRedirect = (path: string) => {
    const url = new URL(path, req.nextUrl.origin)
    return NextResponse.redirect(url)
  }

  if (error) {
    return buildRedirect(`/?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state || state !== storedState) {
    return buildRedirect('/?error=invalid_state')
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return buildRedirect('/?error=server_config')
  }

  // Get the exact redirect URI - must match what was sent in auth request
  let redirectUri = SPOTIFY_REDIRECT_URI.trim().replace(/\/$/, '')
  if (!process.env.SPOTIFY_REDIRECT_URI) {
    const origin = req.nextUrl.origin
    redirectUri = `${origin}/api/spotify/callback`
  }

  console.log('Spotify Callback - Using redirect URI:', redirectUri)

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri, // Must match exactly what was sent in auth request
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      return buildRedirect(`/?error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`)
    }

    // Store tokens in cookies (in production, use a more secure method like a database)
    const response = buildRedirect('/')
    response.cookies.set('spotify_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
    })
    
    if (tokenData.refresh_token) {
      response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    response.cookies.delete('spotify_auth_state')

    return response
  } catch (error) {
    console.error('Spotify callback error:', error)
    return buildRedirect('/?error=callback_error')
  }
}

