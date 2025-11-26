declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void
    Spotify: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume: number
      }) => SpotifyPlayer
    }
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (data: any) => void): void
  removeListener(event: string): void
  getCurrentState(): Promise<SpotifyPlayerState | null>
  setName(name: string): Promise<void>
  getVolume(): Promise<number>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  togglePlay(): Promise<void>
  seek(position_ms: number): Promise<void>
  previousTrack(): Promise<void>
  nextTrack(): Promise<void>
  activateElement(): Promise<void>
}

interface SpotifyPlayerState {
  context: {
    uri: string
    metadata: any
  }
  disallows: {
    pausing: boolean
    skipping_prev: boolean
  }
  paused: boolean
  position: number
  duration: number
  repeat_mode: number
  shuffle: boolean
  track_window: {
    current_track: SpotifyTrack
    previous_tracks: SpotifyTrack[]
    next_tracks: SpotifyTrack[]
  }
}

interface SpotifyTrack {
  id: string
  uri: string
  type: string
  linked_from_uri: string | null
  linked_from: {
    uri: string | null
    id: string | null
  }
  media_type: string
  name: string
  duration_ms: number
  artists: Array<{
    name: string
    uri: string
  }>
  album: {
    uri: string
    name: string
    images: Array<{
      url: string
      height: number
      width: number
    }>
  }
  is_playable: boolean
}

export {}

