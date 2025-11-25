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

  return accessToken || null
}

export async function POST(req: NextRequest) {
  const accessToken = await getAccessToken(req)

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      action,
      context_uri,
      position_ms,
      track_uri,
      offset,
    }: {
      action: 'play' | 'pause' | 'next' | 'previous'
      context_uri?: string
      position_ms?: number
      track_uri?: string
      offset?: number
    } = body

    let endpoint = 'https://api.spotify.com/v1/me/player'
    let method = 'PUT'
    let requestBody: any = {}

    if (action === 'play') {
      endpoint += '/play'
      // Only include context_uri if provided (starting new playback)
      if (context_uri) {
        requestBody.context_uri = context_uri
        // If we have an offset with context_uri, include it
        if (typeof offset === 'number') {
          requestBody.offset = { position: offset }
        }
      }
      // track_uri takes precedence if provided
      if (track_uri) {
        requestBody.uris = [track_uri]
        // Clear context_uri if track_uri is provided
        delete requestBody.context_uri
      }
      if (position_ms !== undefined) {
        requestBody.position_ms = position_ms
      }
      // If no body needed (just resume), send empty object
      // Spotify will resume current playback
    } else if (action === 'pause') {
      endpoint += '/pause'
    } else if (action === 'next') {
      endpoint += '/next'
      method = 'POST'
    } else if (action === 'previous') {
      endpoint += '/previous'
      method = 'POST'
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
    })

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({ error: errorData.error?.message || 'Playback failed' }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Playback error:', error)
    return NextResponse.json({ error: 'playback_error' }, { status: 500 })
  }
}

