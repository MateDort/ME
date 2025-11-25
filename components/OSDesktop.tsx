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
      <div className="fixed inset-0 bg-black flex items-center justify-center">
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
          
          <h1 className="text-4xl font-mono font-bold text-white mb-4">
            No Screens After 7:30 PM
          </h1>
          
          <p className="text-xl font-mono text-gray-400 mb-8">
            Time to rest. MEOS is locked until {getUnlockTime()}.
          </p>
          
          <div className="bg-white border-2 border-white px-8 py-4 inline-block">
            <p className="font-mono text-xs text-gray-500 mb-1">Current Time</p>
            <p className="text-3xl font-mono text-black">{currentTime}</p>
          </div>
          
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white"
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
          
          <p className="font-mono text-gray-500 mt-8 text-sm">
            💤 Good sleep = better thinking tomorrow
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#a8a8a8]">
      {/* Classic Mac desktop pattern */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              #b0b0b0 1px,
              #b0b0b0 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              #b0b0b0 1px,
              #b0b0b0 2px
            )
          `,
          backgroundSize: '4px 4px',
        }}
      />
      
      {/* Desktop icons area */}
      <div className="absolute top-10 right-4 flex flex-col gap-2">
        <div className="flex flex-col items-center cursor-pointer hover:opacity-80">
          <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0_#000]">
            💾
          </div>
          <span className="font-mono text-xs mt-1 bg-white px-1">Macintosh HD</span>
        </div>
        <div className="flex flex-col items-center cursor-pointer hover:opacity-80">
          <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0_#000]">
            🗑️
          </div>
          <span className="font-mono text-xs mt-1 bg-white px-1">Trash</span>
        </div>
      </div>
      
      <MenuBar timeIcon={timeIcons[timeOfDay]} />
      <div className="pt-7">
        <WindowManager />
      </div>
      <Dock />
      <NotificationCenter />
      <CommandPalette />
    </div>
  )
}
