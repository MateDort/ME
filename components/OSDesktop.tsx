'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useOSStore } from '@/lib/store'
import WindowManager from './WindowManager'
import Dock from './Dock'
import NotificationCenter from './NotificationCenter'
import CommandPalette from './CommandPalette'
import MenuBar from './MenuBar'
import { getMEAgentThought } from '@/lib/agents'

type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'night'

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return 'morning'
  if (hour >= 10 && hour < 17) return 'midday'
  if (hour >= 17 && hour < 21) return 'afternoon'
  return 'night'
}

// Check if screen should be locked (7:30 PM to 5:00 AM)
function isScreenLocked(): boolean {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes
  
  const lockStart = 19 * 60 + 30
  const lockEnd = 5 * 60
  
  return currentMinutes >= lockStart || currentMinutes < lockEnd
}

function getUnlockTime(): string {
  return '5:00 AM'
}

const timeIcons: Record<TimeOfDay, string> = {
  morning: '🌅',
  midday: '☀️',
  afternoon: '🌇',
  night: '🌙',
}

// Classic macOS-style wallpapers for different times of day
const timeWallpapers: Record<TimeOfDay, { gradient: string; overlay?: string }> = {
  morning: {
    // Sunrise mountain scene - soft pinks and oranges
    gradient: `
      linear-gradient(to bottom, 
        #ffecd2 0%, 
        #fcb69f 30%, 
        #ee9ca7 50%,
        #91c4d3 70%,
        #667db6 100%
      )
    `,
  },
  midday: {
    // High Sierra inspired - blue sky with warm mountain tones
    gradient: `
      linear-gradient(to bottom,
        #56ccf2 0%,
        #4facfe 20%,
        #00c6fb 40%,
        #c4a35a 60%,
        #dc6c4e 75%,
        #8b4513 90%,
        #654321 100%
      )
    `,
  },
  afternoon: {
    // Sunset colors - golden hour
    gradient: `
      linear-gradient(to bottom,
        #ff7e5f 0%,
        #feb47b 20%,
        #ff6b6b 40%,
        #c44d2c 60%,
        #6b3a2e 80%,
        #2d1f1f 100%
      )
    `,
  },
  night: {
    // Night sky with stars feel
    gradient: `
      linear-gradient(to bottom,
        #0f0c29 0%,
        #302b63 30%,
        #24243e 60%,
        #1a1a2e 100%
      )
    `,
  },
}

export default function OSDesktop() {
  const { addNotification } = useOSStore()
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday')
  const [isLocked, setIsLocked] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setTimeOfDay(getTimeOfDay())
      setIsLocked(isScreenLocked())
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const scheduleNotification = () => {
      const delay = Math.random() * 3000000 + 600000
      setTimeout(async () => {
        const thought = await getMEAgentThought()
        addNotification({
          id: Date.now().toString(),
          title: 'Thought from Emese',
          message: thought,
          timestamp: new Date(),
        })
        scheduleNotification()
      }, delay)
    }

    scheduleNotification()
  }, [addNotification])

  // Screen lock overlay
  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-8"
        >
          <motion.div
            animate={{ 
              y: [0, -10, 0],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-8xl mb-8"
          >
            🌙
          </motion.div>
          
          <h1 className="text-4xl font-light text-white mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            No Screens After 7:30 PM
          </h1>
          
          <p className="text-xl text-white/60 mb-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            Time to rest. MEOS is locked until {getUnlockTime()}.
          </p>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 inline-block border border-white/20">
            <p className="text-xs text-white/40 mb-1">Current Time</p>
            <p className="text-3xl font-light text-white">{currentTime}</p>
          </div>
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
          
          <p className="text-white/40 mt-8 text-sm" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            💤 Good sleep = better thinking tomorrow
          </p>
        </motion.div>
      </div>
    )
  }

  const wallpaper = timeWallpapers[timeOfDay]

  return (
    <div 
      className="fixed inset-0 transition-all duration-1000"
      style={{ 
        background: wallpaper.gradient,
      }}
    >
      {/* Subtle noise texture overlay for depth */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Desktop icons area - macOS style in top right */}
      <div className="absolute top-10 right-4 flex flex-col gap-4 items-center">
        <motion.div 
          className="flex flex-col items-center cursor-pointer group"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-16 h-14 bg-gradient-to-b from-gray-200 to-gray-400 rounded-lg flex items-center justify-center shadow-lg border border-white/30">
            <span className="text-3xl">💾</span>
          </div>
          <span 
            className="text-white text-xs mt-1 px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm shadow-sm"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            Macintosh HD
          </span>
        </motion.div>
      </div>
      
      <MenuBar timeIcon={timeIcons[timeOfDay]} />
      <div className="pt-6">
        <WindowManager />
      </div>
      <Dock />
      <NotificationCenter />
      <CommandPalette />
    </div>
  )
}
