'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useOSStore } from '@/lib/store'

interface PianoKey {
  note: string
  frequency: number
  isBlack: boolean
  keyCode: string
}

const PIANO_KEYS: PianoKey[] = [
  { note: 'C', frequency: 261.63, isBlack: false, keyCode: 'a' },
  { note: 'C#', frequency: 277.18, isBlack: true, keyCode: 'w' },
  { note: 'D', frequency: 293.66, isBlack: false, keyCode: 's' },
  { note: 'D#', frequency: 311.13, isBlack: true, keyCode: 'e' },
  { note: 'E', frequency: 329.63, isBlack: false, keyCode: 'd' },
  { note: 'F', frequency: 349.23, isBlack: false, keyCode: 'f' },
  { note: 'F#', frequency: 369.99, isBlack: true, keyCode: 't' },
  { note: 'G', frequency: 392.00, isBlack: false, keyCode: 'g' },
  { note: 'G#', frequency: 415.30, isBlack: true, keyCode: 'y' },
  { note: 'A', frequency: 440.00, isBlack: false, keyCode: 'h' },
  { note: 'A#', frequency: 466.16, isBlack: true, keyCode: 'u' },
  { note: 'B', frequency: 493.88, isBlack: false, keyCode: 'j' },
  { note: 'C2', frequency: 523.25, isBlack: false, keyCode: 'k' },
  { note: 'C#2', frequency: 554.37, isBlack: true, keyCode: 'o' },
  { note: 'D2', frequency: 587.33, isBlack: false, keyCode: 'l' },
  { note: 'D#2', frequency: 622.25, isBlack: true, keyCode: 'p' },
  { note: 'E2', frequency: 659.25, isBlack: false, keyCode: ';' },
]

export default function PianoApp() {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [audioEnabled, setAudioEnabled] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorsRef = useRef<Map<string, { oscillator: OscillatorNode; gainNode: GainNode; timeout: NodeJS.Timeout }>>(new Map())
  const activeKeysRef = useRef<Set<string>>(new Set())
  const { windows, activeWindow } = useOSStore()
  const pianoWindowIdRef = useRef<string | null>(null)

  // Find the piano window ID
  useEffect(() => {
    const pianoWindow = windows.find(w => w.component === 'piano')
    if (pianoWindow) {
      pianoWindowIdRef.current = pianoWindow.id
    }
  }, [windows])

  const isPianoActive = activeWindow === pianoWindowIdRef.current

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    if (audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
        setAudioEnabled(true)
        console.log('✅ AudioContext resumed')
        return true
      } catch (e) {
        console.error('❌ Failed to resume AudioContext:', e)
        return false
      }
    } else {
      setAudioEnabled(true)
      return true
    }
  }, [])

  const playNote = useCallback(async (key: PianoKey) => {
    console.log('🎹 Attempting to play note:', key.note, key.frequency)
    
    // Initialize audio if needed
    if (!audioContextRef.current) {
      const success = await initAudioContext()
      if (!success) {
        console.error('Failed to initialize audio')
        return
      }
    }
    
    // Resume if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume()
        setAudioEnabled(true)
      } catch (e) {
        console.error('Failed to resume AudioContext:', e)
        return
      }
    }
    
    if (!audioContextRef.current) return
    
    // Stop existing note if playing
    if (oscillatorsRef.current.has(key.note)) {
      stopNote(key.note)
    }
    
    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.value = key.frequency
      
      // Set initial gain (louder)
      const currentTime = audioContextRef.current.currentTime
      gainNode.gain.setValueAtTime(0.3, currentTime)
      // Fade out over 1 second
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 1.0)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.start(currentTime)
      
      // Auto-stop after 1 second
      const timeout = setTimeout(() => {
        stopNote(key.note)
      }, 1000)
      
      oscillatorsRef.current.set(key.note, { oscillator, gainNode, timeout })
      console.log('✅ Playing note:', key.note, key.frequency, 'Hz')
    } catch (error) {
      console.error('❌ Error playing note:', error)
    }
  }, [initAudioContext])

  const stopNote = useCallback((note: string) => {
    const audioData = oscillatorsRef.current.get(note)
    if (audioData) {
      try {
        clearTimeout(audioData.timeout)
        audioData.oscillator.stop()
        audioData.oscillator.disconnect()
        audioData.gainNode.disconnect()
      } catch (e) {
        // Ignore errors - oscillator might already be stopped
      }
      oscillatorsRef.current.delete(note)
    }
  }, [])

  // Global keyboard handler - only works when piano window is active
  useEffect(() => {
    if (!isPianoActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with Command Palette (M key)
      if (e.key === 'm' || e.key === 'M') return
      
      // Normalize key
      let key = e.key.toLowerCase()
      
      // Handle special keys
      if (e.key === ';' || e.key === 'Semicolon') {
        key = ';'
      }
      
      const pianoKey = PIANO_KEYS.find(k => k.keyCode === key)
      
      if (pianoKey) {
        e.preventDefault()
        e.stopPropagation()
        
        if (!activeKeysRef.current.has(pianoKey.note)) {
          activeKeysRef.current.add(pianoKey.note)
          playNote(pianoKey)
          setPressedKeys(prev => new Set([...Array.from(prev), pianoKey.note]))
        }
      }
    }
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // Normalize key
      let key = e.key.toLowerCase()
      
      // Handle special keys
      if (e.key === ';' || e.key === 'Semicolon') {
        key = ';'
      }
      
      const pianoKey = PIANO_KEYS.find(k => k.keyCode === key)
      
      if (pianoKey) {
        e.preventDefault()
        e.stopPropagation()
        
        if (activeKeysRef.current.has(pianoKey.note)) {
          activeKeysRef.current.delete(pianoKey.note)
          stopNote(pianoKey.note)
          setPressedKeys(prev => {
            const next = new Set(prev)
            next.delete(pianoKey.note)
            return next
          })
        }
      }
    }
    
    // Use capture phase and make sure we get the events
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [isPianoActive, playNote, stopNote])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach(({ oscillator, gainNode, timeout }) => {
        try {
          clearTimeout(timeout)
          oscillator.stop()
          oscillator.disconnect()
          gainNode.disconnect()
        } catch (e) {
          // Ignore errors
        }
      })
      oscillatorsRef.current.clear()
      activeKeysRef.current.clear()
    }
  }, [])

  const handleKeyClick = useCallback(async (key: PianoKey) => {
    // Initialize audio on first click
    if (!audioEnabled) {
      await initAudioContext()
    }
    
    if (activeKeysRef.current.has(key.note)) {
      activeKeysRef.current.delete(key.note)
      stopNote(key.note)
      setPressedKeys(prev => {
        const next = new Set(prev)
        next.delete(key.note)
        return next
      })
    } else {
      activeKeysRef.current.add(key.note)
      await playNote(key)
      setPressedKeys(prev => new Set([...Array.from(prev), key.note]))
    }
  }, [audioEnabled, initAudioContext, playNote, stopNote])

  const whiteKeys = PIANO_KEYS.filter(k => !k.isBlack)
  const blackKeys = PIANO_KEYS.filter(k => k.isBlack)

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="bg-gray-800 border-b-4 border-gray-600 p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎹 Piano</h2>
            <p className="text-sm text-gray-400">
              {isPianoActive 
                ? '✅ Window active - Press keys: A S D F G H J K L (white) | W E T Y U O P (black)' 
                : '⚠️ Click on this window first to activate keyboard controls'}
            </p>
            <p className="text-xs text-yellow-400 mt-1">
              {audioEnabled ? '✅ Audio enabled' : '⚠️ Click "Enable Audio" or click a key'}
            </p>
          </div>
          <button
            onClick={async () => {
              const enabled = await initAudioContext()
              if (enabled) {
                alert('✅ Audio enabled! You can now play the piano with keyboard or mouse.')
              } else {
                alert('❌ Failed to enable audio. Please try clicking a key first.')
              }
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded font-bold text-sm border-2 border-green-800"
          >
            🔊 Enable Audio
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative" style={{ width: '90%', maxWidth: '1200px' }}>
          {/* White Keys */}
          <div className="flex relative">
            {whiteKeys.map((key, idx) => (
              <motion.button
                key={key.note}
                onClick={() => handleKeyClick(key)}
                className={`relative bg-white text-gray-800 border-2 border-gray-400 rounded-b-lg ${
                  pressedKeys.has(key.note) ? 'bg-gray-300' : 'hover:bg-gray-100'
                }`}
                style={{
                  width: `${100 / whiteKeys.length}%`,
                  height: '300px',
                  marginRight: idx < whiteKeys.length - 1 ? '2px' : '0',
                  zIndex: 1,
                }}
                whileHover={{ scale: 0.98 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.1 }}
              >
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <div className="text-xs font-bold">{key.note}</div>
                  <div className="text-xs text-gray-500">{key.keyCode.toUpperCase()}</div>
                </div>
              </motion.button>
            ))}
          </div>
          
          {/* Black Keys */}
          <div className="absolute top-0 left-0 right-0 flex" style={{ height: '180px' }}>
            {PIANO_KEYS.map((key) => {
              if (!key.isBlack) return null
              
              const whiteKeysBefore = whiteKeys.filter(
                wk => PIANO_KEYS.indexOf(wk) < PIANO_KEYS.indexOf(key)
              ).length
              
              return (
                <motion.button
                  key={key.note}
                  onClick={() => handleKeyClick(key)}
                  className={`absolute bg-gray-900 text-white border-2 border-gray-700 rounded-b-lg ${
                    pressedKeys.has(key.note) ? 'bg-gray-700' : 'hover:bg-gray-800'
                  }`}
                  style={{
                    width: '6%',
                    height: '180px',
                    left: `${(whiteKeysBefore * (100 / whiteKeys.length)) + (100 / whiteKeys.length * 0.6)}%`,
                    zIndex: 2,
                  }}
                  whileHover={{ scale: 0.98 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <div className="text-xs font-bold">{key.note}</div>
                    <div className="text-xs text-gray-400">{key.keyCode.toUpperCase()}</div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
