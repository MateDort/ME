'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useSpotifyPlayer } from '@/hooks/useSpotifyPlayer'

interface Track {
  id: string
  title: string
  artist: string
  duration: string
  image?: string
}

interface Playlist {
  id: string
  name: string
  description: string
  tracks: Track[]
  uri: string
}

type ScreenMode = 'now_playing' | 'playlists' | 'tracks'

export default function MusicPlayer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [screenMode, setScreenMode] = useState<ScreenMode>('now_playing')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [playerDeviceId, setPlayerDeviceId] = useState<string | null>(null)
  const isPlaybackPendingRef = useRef(false)

  // Initialize Spotify Web Playback SDK
  const {
    isReady: isPlayerReady,
    deviceId,
    play: playerPlay,
    togglePlay: playerTogglePlay,
    nextTrack: playerNextTrack,
    previousTrack: playerPreviousTrack,
    setVolume: playerSetVolume,
    getVolume: playerGetVolume,
  } = useSpotifyPlayer({
    accessToken,
    onReady: (deviceId) => {
      console.log('MEOS Player ready! Device ID:', deviceId)
      setPlayerDeviceId(deviceId)
      // Check volume after a short delay
      setTimeout(async () => {
        if (playerGetVolume) {
          const vol = await playerGetVolume()
          console.log('Current volume after ready:', vol * 100 + '%')
        }
      }, 1000)
    },
    onPlayerStateChange: (state) => {
      if (state) {
        console.log('Playback state:', { paused: state.paused, position: state.position })
        setIsPlaying(!state.paused)
        setPlaybackProgress((state.position / state.duration) * 100)
        setCurrentTrack({
          id: state.track_window.current_track.id,
          title: state.track_window.current_track.name,
          artist: state.track_window.current_track.artists
            .map((a) => a.name)
            .join(', '),
          duration: formatDuration(state.track_window.current_track.duration_ms),
          image: state.track_window.current_track.album.images[0]?.url,
        })
      }
    },
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists()
    }
  }, [isAuthenticated])

  const checkAuth = async () => {
    try {
      // Get access token
      const tokenResponse = await fetch('/api/spotify/token')
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        setAccessToken(tokenData.accessToken)
        setIsAuthenticated(true)
        loadPlaylists()
      } else {
        setIsAuthenticated(false)
      }
    } catch {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadPlaylists = async () => {
    try {
      const response = await fetch('/api/spotify/playlists')
      if (response.ok) {
        const data = await response.json()
        const formatted: Playlist[] = data.playlists.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          tracks: [],
          uri: p.uri,
        }))
        setPlaylists(formatted)
      }
    } catch (error) {
      console.error('Error loading playlists:', error)
    }
  }

  const loadPlaylistTracks = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/spotify/playlists/${playlistId}/tracks`)
      if (response.ok) {
        const data = await response.json()
        return (data.tracks || []).map((t: any) => ({
          id: t.track.id,
          title: t.track.name,
          artist: t.track.artists.map((a: any) => a.name).join(', '),
          duration: formatDuration(t.track.duration_ms),
          image: t.track.album?.images?.[0]?.url,
        }))
      }
    } catch (error) {
      console.error('Error loading playlist tracks:', error)
    }
    return []
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleConnect = () => {
    window.location.href = '/api/spotify/auth'
  }

  const handlePlaylistSelect = async (playlist: Playlist) => {
    setScreenMode('tracks')
    setSelectedPlaylist(playlist)
    const tracks = await loadPlaylistTracks(playlist.id)
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlist.id ? { ...p, tracks } : p))
    )
    setSelectedPlaylist({ ...playlist, tracks })
  }

  const handlePlay = async () => {
    // If player not ready, show message
    if (!isPlayerReady || !deviceId) {
      console.log('Player not ready yet...')
      return
    }

    // If currently playing, just toggle pause
    if (isPlaying) {
      await playerTogglePlay()
      return
    }

    // If no playlist selected, go to playlists
    if (!selectedPlaylist) {
      if (playlists.length > 0) {
        setScreenMode('playlists')
        return
      }
      return
    }

    // If we have a playlist but no tracks loaded, load them first
    if (selectedPlaylist.tracks.length === 0) {
      const tracks = await loadPlaylistTracks(selectedPlaylist.id)
      const updatedPlaylist = { ...selectedPlaylist, tracks }
      setPlaylists((prev) =>
        prev.map((p) => (p.id === selectedPlaylist.id ? updatedPlaylist : p))
      )
      setSelectedPlaylist(updatedPlaylist)
      
      // If still no tracks, can't play
      if (tracks.length === 0) return
    }

    // Play using Web Playback SDK
    try {
      await playerPlay(selectedPlaylist.uri)
      setIsPlaying(true)
      if (selectedPlaylist.tracks.length > 0 && !currentTrack) {
        setCurrentTrack(selectedPlaylist.tracks[0])
      }
    } catch (error) {
      console.error('Error playing:', error)
    }
  }

  const handleNext = async () => {
    if (!isPlayerReady) return
    try {
      await playerNextTrack()
    } catch (error) {
      console.error('Error skipping:', error)
    }
  }

  const handlePrevious = async () => {
    if (!isPlayerReady) return
    try {
      await playerPreviousTrack()
    } catch (error) {
      console.error('Error going back:', error)
    }
  }

  const handleTrackSelect = async (track: Track, index: number) => {
    if (!selectedPlaylist || !isPlayerReady || !deviceId) return
    try {
      // Use the Web Playback SDK to play from context with offset (track index)
      await playerPlay(selectedPlaylist.uri, index)
      setCurrentTrack(track)
      setIsPlaying(true)
      setScreenMode('now_playing')
    } catch (error) {
      console.error('Error playing track:', error)
    }
  }

  const handleMenuClick = () => {
    if (screenMode === 'tracks') {
      setScreenMode('playlists')
    } else if (screenMode === 'playlists') {
      setScreenMode('now_playing')
    } else {
      setScreenMode('playlists')
    }
  }

  const renderNowPlaying = () => (
    <>
      {currentTrack ? (
        <>
          {currentTrack.image ? (
            <img
              src={currentTrack.image}
              alt={currentTrack.title}
              className="w-24 h-24 rounded-lg mb-3 object-cover"
            />
          ) : (
            <div className="text-6xl mb-4">🎵</div>
          )}
          <h3 className="text-xl font-bold mb-2 text-center">
            {currentTrack.title}
          </h3>
          <p className="text-gray-400 mb-4 text-sm">{currentTrack.artist}</p>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">🎵</div>
          <p>Press Menu to browse playlists</p>
        </div>
      )}
    </>
  )

  const renderPlaylists = () => (
    <div className="w-full h-full overflow-y-auto space-y-2 pr-1">
      <h3 className="text-sm text-gray-300 mb-2">Your Playlists</h3>
      {playlists.length === 0 ? (
        <p className="text-center text-gray-500 text-sm">
          No playlists found. Make sure Spotify is connected.
        </p>
      ) : (
        playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => handlePlaylistSelect(playlist)}
            className={`w-full text-left p-2 rounded text-sm ${
              selectedPlaylist?.id === playlist.id
                ? 'bg-retro-blue text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <div className="font-semibold truncate">{playlist.name}</div>
            {playlist.description && (
              <div className="text-xs text-gray-400 truncate">
                {playlist.description}
              </div>
            )}
          </button>
        ))
      )}
    </div>
  )

  const renderTracks = () => (
    <div className="w-full h-full overflow-y-auto space-y-2 pr-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-gray-300">
          {selectedPlaylist?.name || 'Tracks'}
        </h3>
        <span className="text-xs text-gray-500">Menu to go back</span>
      </div>
      {selectedPlaylist?.tracks.length ? (
        selectedPlaylist.tracks.map((track, index) => (
          <button
            key={track.id}
            onClick={() => handleTrackSelect(track, index)}
            className={`w-full text-left p-2 rounded text-sm ${
              currentTrack?.id === track.id
                ? 'bg-retro-blue text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-white'
            }`}
          >
            <div className="flex justify-between">
              <span className="truncate">{track.title}</span>
              <span className="text-gray-400 ml-2">{track.duration}</span>
            </div>
            <div className="text-xs text-gray-400 truncate">{track.artist}</div>
          </button>
        ))
      ) : (
        <p className="text-center text-gray-500 text-sm">
          {selectedPlaylist ? 'Loading tracks...' : 'Select a playlist'}
        </p>
      )}
    </div>
  )

  const renderScreenContent = () => {
    switch (screenMode) {
      case 'playlists':
        return renderPlaylists()
      case 'tracks':
        return renderTracks()
      default:
        return renderNowPlaying()
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⟳</div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white">
        <div className="text-center p-8">
          <div className="text-6xl mb-6">🎵</div>
          <h2 className="text-2xl font-bold mb-4">Connect to Spotify</h2>
          <p className="text-gray-400 mb-6">
            Connect your Spotify account to play your playlists
          </p>
          <button
            onClick={handleConnect}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-lg"
          >
            Connect Spotify
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          className="bg-gray-800 rounded-3xl p-8 border-4 border-gray-700 shadow-2xl"
          style={{ width: '400px', height: '500px' }}
        >
          <div className="bg-black rounded-2xl p-4 mb-6 h-64 flex flex-col border-2 border-gray-600 text-white text-sm">
            {renderScreenContent()}
          </div>

          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center">
              <button
                onClick={handlePlay}
                className="absolute w-20 h-20 rounded-full bg-gray-600 border-2 border-gray-500 flex items-center justify-center hover:bg-gray-500"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <button
                onClick={handleMenuClick}
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-gray-600 rounded-t-lg border border-gray-500 text-xs hover:bg-gray-500"
              >
                Menu
              </button>

              <button
                onClick={handlePrevious}
                className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-8 h-12 bg-gray-600 rounded-l-lg border border-gray-500"
              >
                ⏮
              </button>

              <button
                onClick={handleNext}
                className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-8 h-12 bg-gray-600 rounded-r-lg border border-gray-500"
              >
                ⏭
              </button>

              <button
                onClick={handlePlay}
                className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-gray-600 rounded-b-lg border border-gray-500"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="border-t-2 border-gray-800 bg-gray-900 p-4 text-sm text-gray-400">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex-1 text-center">
            {!isPlayerReady && accessToken ? (
              <p className="text-yellow-400 animate-pulse">🎵 Initializing MEOS Player...</p>
            ) : isPlayerReady ? (
              <p>🎵 MEOS Player Ready • Menu → playlists • Select → tracks</p>
            ) : (
              <p>Menu → playlists • Select playlist → tracks • Center = play / pause</p>
            )}
          </div>
          {isPlayerReady && (
            <button
              onClick={async () => {
                const currentVol = await playerGetVolume?.()
                console.log('Current volume:', currentVol)
                await playerSetVolume?.(1.0)
                alert('Volume set to 100%! Check browser console for details.')
              }}
              className="ml-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs whitespace-nowrap"
            >
              🔊 Check Volume
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

