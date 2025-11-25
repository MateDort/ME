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
  if (hour >= 5 && hour < 10) return 'morning'      // 5am - 10am: Sunrise
  if (hour >= 10 && hour < 17) return 'midday'      // 10am - 5pm: Sunny
  if (hour >= 17 && hour < 21) return 'afternoon'   // 5pm - 9pm: Sunset
  return 'night'                                     // 9pm - 5am: Night
}

// Check if screen should be locked (7:30 PM to 5:00 AM)
function isScreenLocked(): boolean {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentMinutes = hours * 60 + minutes
  
  const lockStart = 19 * 60 + 30  // 7:30 PM = 19:30 = 1170 minutes
  const lockEnd = 5 * 60          // 5:00 AM = 300 minutes
  
  // Locked if after 7:30 PM OR before 5:00 AM
  return currentMinutes >= lockStart || currentMinutes < lockEnd
}

function getUnlockTime(): string {
  return '5:00 AM'
}

const timeBackgrounds: Record<TimeOfDay, string> = {
  morning: 'bg-gradient-to-b from-rose-300 via-orange-200 to-yellow-100',    // Sunrise colors
  midday: 'bg-gradient-to-b from-yellow-200 via-amber-200 to-orange-200',    // Sunny colors
  afternoon: 'bg-gradient-to-b from-orange-300 via-rose-400 to-purple-500',  // Sunset colors
  night: 'bg-gradient-to-b from-slate-900 via-indigo-900 to-slate-800',      // Night colors
}

const timeIcons: Record<TimeOfDay, string> = {
  morning: '🌅',
  midday: '☀️',
  afternoon: '🌇',
  night: '🌙',
}

export default function OSDesktop() {
  const { addNotification } = useOSStore()
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('midday')
  const [isLocked, setIsLocked] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  // Update time of day and lock status on mount and every minute
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
    const interval = setInterval(updateTime, 1000) // Check every second for more responsive lock
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Random notifications from ME agent - between 10 minutes and 1 hour
    const scheduleNotification = () => {
      const delay = Math.random() * 3000000 + 600000 // 10 minutes to 1 hour (600000ms to 3600000ms)
      setTimeout(async () => {
        const thought = await getMEAgentThought()
        addNotification({
          id: Date.now().toString(),
          title: 'Thought from Máté',
          message: thought,
          timestamp: new Date(),
        })
        scheduleNotification() // Schedule next one
      }, delay)
    }

    scheduleNotification()
  }, [addNotification])

  // Screen lock overlay
  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-8"
        >
          {/* Moon icon */}
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
          
          {/* Lock message */}
          <h1 className="text-4xl font-bold text-white mb-4">
            No Screens After 7:30 PM
          </h1>
          
          <p className="text-xl text-slate-400 mb-8">
            Time to rest. MEOS is locked until {getUnlockTime()}.
          </p>
          
          {/* Current time */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl px-8 py-4 inline-block border border-slate-700">
            <p className="text-sm text-slate-500 mb-1">Current Time</p>
            <p className="text-3xl font-mono text-white">{currentTime}</p>
          </div>
          
          {/* Stars animation */}
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
          
          {/* Motivational message */}
          <p className="text-slate-500 mt-8 text-sm">
            💤 Good sleep = better thinking tomorrow
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className={`fixed inset-0 transition-colors duration-1000 ${timeBackgrounds[timeOfDay]}`}>
      <MenuBar timeIcon={timeIcons[timeOfDay]} />
      <div className="pt-8">
        <WindowManager />
      </div>
      <Dock />
      <NotificationCenter />
      <CommandPalette />
    </div>
  )
}

