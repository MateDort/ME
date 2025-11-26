'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpotifyPlayerState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      id: string
      name: string
      artists: { name: string }[]
      album: {
        images: { url: string }[]
      }
      duration_ms: number
    }
  }
}

interface UseSpotifyPlayerOptions {
  accessToken: string | null
  onReady?: (deviceId: string) => void
  onPlayerStateChange?: (state: SpotifyPlayerState | null) => void
}

export function useSpotifyPlayer({
  accessToken,
  onReady,
  onPlayerStateChange,
}: UseSpotifyPlayerOptions) {
  const [isReady, setIsReady] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [player, setPlayer] = useState<any>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const playerRef = useRef<any>(null)

  useEffect(() => {
    if (!accessToken) return

    // Load Spotify Web Playback SDK
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    // @ts-ignore
    window.onSpotifyWebPlaybackSDKReady = () => {
      // @ts-ignore
      const player = new window.Spotify.Player({
        name: 'MEOS Player',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken)
        },
        volume: 0.5,
      })

      // Error handling
      player.addListener('initialization_error', ({ message }: any) => {
        console.error('Spotify Player initialization error:', message)
      })

      player.addListener('authentication_error', ({ message }: any) => {
        console.error('Spotify Player authentication error:', message)
      })

      player.addListener('account_error', ({ message }: any) => {
        console.error('Spotify Player account error:', message)
      })

      player.addListener('playback_error', ({ message }: any) => {
        console.error('Spotify Player playback error:', message)
      })

      // Ready
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player ready with Device ID:', device_id)
        setDeviceId(device_id)
        setIsReady(true)
        setIsPlayerReady(true)
        
        // Set volume to 100% and log it
        player.setVolume(1.0).then(() => {
          console.log('Volume set to 100%')
        })
        
        onReady?.(device_id)
      })

      // Not Ready
      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Spotify Player not ready:', device_id)
        setIsReady(false)
      })

      // State changes
      player.addListener('player_state_changed', (state: SpotifyPlayerState | null) => {
        if (state) {
          onPlayerStateChange?.(state)
        }
      })

      // Connect to the player
      player.connect().then((success: boolean) => {
        if (success) {
          console.log('Spotify Player connected successfully')
        }
      })

      setPlayer(player)
      playerRef.current = player
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
  }, [accessToken, onReady, onPlayerStateChange])

  const play = useCallback(
    async (spotify_uri?: string, offset?: number) => {
      if (!deviceId || !accessToken) {
        console.log('Cannot play: missing deviceId or accessToken')
        return
      }

      try {
        const body: any = {}
        if (spotify_uri) {
          if (spotify_uri.includes('track')) {
            body.uris = [spotify_uri]
          } else {
            body.context_uri = spotify_uri
            // If offset is provided, add it for playlist/album playback
            if (offset !== undefined) {
              body.offset = { position: offset }
            }
          }
        }

        console.log('Starting playback:', { deviceId, spotify_uri, offset })
        
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Play API error:', response.status, errorText)
        } else {
          console.log('Playback started successfully')
        }
      } catch (error) {
        console.error('Play error:', error)
      }
    },
    [deviceId, accessToken]
  )

  const pause = useCallback(async () => {
    if (!deviceId || !accessToken) return

    try {
      await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    } catch (error) {
      console.error('Pause error:', error)
    }
  }, [deviceId, accessToken])

  const togglePlay = useCallback(async () => {
    if (!player) return
    player.togglePlay()
  }, [player])

  const nextTrack = useCallback(async () => {
    if (!player) return
    player.nextTrack()
  }, [player])

  const previousTrack = useCallback(async () => {
    if (!player) return
    player.previousTrack()
  }, [player])

  const getCurrentState = useCallback(async () => {
    if (!player) return null
    return await player.getCurrentState()
  }, [player])

  const setVolume = useCallback(
    async (volume: number) => {
      if (!player) return
      await player.setVolume(volume)
      console.log('Volume set to:', volume * 100 + '%')
    },
    [player]
  )

  const getVolume = useCallback(async () => {
    if (!player) return 0
    return await player.getVolume()
  }, [player])

  return {
    player,
    isReady,
    isPlayerReady,
    deviceId,
    play,
    pause,
    togglePlay,
    nextTrack,
    previousTrack,
    getCurrentState,
    setVolume,
    getVolume,
  }
}

