import { NextRequest, NextResponse } from 'next/server'

async function getAccessToken(req: NextRequest): Promise<string | null> {
  let accessToken = req.cookies.get('spotify_access_token')?.value

  if (!accessToken) {
    return null
  }

  // Try to use the token, refresh if needed
  try {
    const testResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (testResponse.status === 401) {
      // Token expired, try to refresh
      const refreshToken = req.cookies.get('spotify_refresh_token')?.value
      if (!refreshToken) return null

      const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
      const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

      if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null

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
      if (tokenResponse.ok && tokenData.access_token) {
        accessToken = tokenData.access_token
      } else {
        return null
      }
    }
  } catch (error) {
    console.error('Token check error:', error)
    return null
  }

  return accessToken
}

export async function GET(req: NextRequest) {
  const accessToken = await getAccessToken(req)

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ playlists: data.items || [] })
  } catch (error) {
    console.error('Playlists fetch error:', error)
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 })
  }
}

