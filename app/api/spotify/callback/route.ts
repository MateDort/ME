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

  console.log('Spotify Callback - State check:', {
    receivedState: state,
    storedState: storedState,
    matches: state === storedState,
    hasCode: !!code,
    allCookies: req.cookies.getAll().map(c => c.name),
  })

  const buildRedirect = (path: string) => {
    const url = new URL(path, req.nextUrl.origin)
    // Use meta refresh instead of 307 redirect to ensure cookies persist
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0;url=${path}" />
        </head>
        <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000; color: #fff;">
          <p>Redirecting...</p>
        </body>
      </html>
    `
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (error) {
    return buildRedirect(`/?error=${encodeURIComponent(error)}`)
  }

  if (!code) {
    console.error('Spotify callback: No authorization code received')
    return buildRedirect('/?error=no_code')
  }

  // Skip state validation in development (cookies don't always persist through OAuth redirects)
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Skipping state validation')
  } else if (!state || state !== storedState) {
    console.error('Spotify state mismatch or missing data')
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
      console.error('Spotify token exchange failed:', tokenData)
      return buildRedirect(`/?error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`)
    }

    console.log('Spotify Callback - Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    })

    // Return an HTML page that sets cookies via meta refresh
    // This ensures cookies are set before redirecting
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spotify Connected</title>
          <meta http-equiv="refresh" content="1;url=/" />
        </head>
        <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000;">
          <div style="text-align: center; color: #1DB954;">
            <h1>✓ Spotify Connected</h1>
            <p>Redirecting...</p>
          </div>
        </body>
      </html>
    `

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    })

    // Set cookies on this response (not a redirect)
    response.cookies.set('spotify_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokenData.expires_in || 3600,
    })
    
    console.log('Spotify Callback - Set access token cookie (expires in', tokenData.expires_in, 'seconds)')
    
    if (tokenData.refresh_token) {
      response.cookies.set('spotify_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      console.log('Spotify Callback - Set refresh token cookie (expires in 30 days)')
    }

    response.cookies.delete('spotify_auth_state')

    console.log('Spotify Callback - Cookies set, will redirect via HTML meta refresh')
    return response
  } catch (error) {
    console.error('Spotify callback error:', error)
    return buildRedirect('/?error=callback_error')
  }
}

