import { NextRequest, NextResponse } from 'next/server'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('spotify_refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 })
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: tokenData.error || 'refresh_failed' }, { status: 401 })
    }

    // Update access token cookie
    const response = NextResponse.json({ 
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    })
    
    response.cookies.set('spotify_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
    })

    return response
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json({ error: 'refresh_error' }, { status: 500 })
  }
}

