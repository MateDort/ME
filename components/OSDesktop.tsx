'use client'

import { useEffect, useState } from 'react'
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

  // Update time of day on mount and every minute
  useEffect(() => {
    setTimeOfDay(getTimeOfDay())
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay())
    }, 60000) // Check every minute
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

