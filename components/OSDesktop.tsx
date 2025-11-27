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

function isScreenLocked(): boolean {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes
  
  const lockStart = 22 * 60 + 30
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

// Classic Mac OS X Aqua wallpapers - blue themed
const timeWallpapers: Record<TimeOfDay, string> = {
  morning: `
    radial-gradient(ellipse at 50% 30%, rgba(255,200,150,0.4) 0%, transparent 50%),
    linear-gradient(to bottom,
      #87CEEB 0%,
      #6FB6E8 20%,
      #5E9FD9 40%,
      #4D88CA 60%,
      #3C71BB 80%,
      #2B5AAC 100%
    )
  `,
  midday: `
    radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.3) 0%, transparent 60%),
    linear-gradient(to bottom,
      #5BA3E0 0%,
      #4D8FCD 25%,
      #3F7BBA 50%,
      #3167A7 75%,
      #235394 100%
    )
  `,
  afternoon: `
    radial-gradient(ellipse at 50% 40%, rgba(255,150,100,0.4) 0%, transparent 50%),
    linear-gradient(to bottom,
      #E89C6F 0%,
      #D1885E 25%,
      #BA744D 50%,
      #A3603C 75%,
      #8C4C2B 100%
    )
  `,
  night: `
    radial-gradient(ellipse at 50% 20%, rgba(100,100,200,0.3) 0%, transparent 50%),
    linear-gradient(to bottom,
      #1E3A5F 0%,
      #182D4A 33%,
      #122035 66%,
      #0C1320 100%
    )
  `,
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

  if (isLocked) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: timeWallpapers.night }}
      >
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
          
          <div 
            className="bg-white/10 backdrop-blur-md rounded-2xl px-12 py-8 border border-white/30"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <h1 className="text-4xl font-bold text-white mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              No Screens After 7:30 PM
            </h1>
            
            <p className="text-xl text-white/80 mb-6">
              Time to rest. MEOS is locked until {getUnlockTime()}.
            </p>
            
            <div className="bg-black/30 rounded-xl px-8 py-4 border border-white/20">
              <p className="text-xs text-white/60 mb-1">Current Time</p>
              <p className="text-3xl font-bold text-white">{currentTime}</p>
            </div>
          </div>
          
          <p className="text-white/60 mt-8 text-sm">
            💤 Good sleep = better thinking tomorrow
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0"
      style={{ 
        background: timeWallpapers[timeOfDay],
      }}
    >
      {/* Classic Aqua desktop icons - top right */}
      <div className="absolute top-8 right-6 flex flex-col gap-4 items-center">
        <motion.div 
          className="flex flex-col items-center cursor-pointer group"
          whileHover={{ scale: 1.05 }}
        >
          <div 
            className="w-20 h-18 rounded-lg flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(220,220,220,0.8) 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.5)',
            }}
          >
            <span className="text-4xl">💾</span>
          </div>
          <span 
            className="text-white text-sm mt-2 px-3 py-1 rounded font-bold"
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5)',
            }}
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
