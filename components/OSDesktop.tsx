'use client'

import { useEffect } from 'react'
import { useOSStore } from '@/lib/store'
import WindowManager from './WindowManager'
import Dock from './Dock'
import NotificationCenter from './NotificationCenter'
import CommandPalette from './CommandPalette'
import MenuBar from './MenuBar'
import { getMEAgentThought } from '@/lib/agents'

export default function OSDesktop() {
  const { addNotification } = useOSStore()

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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="scanline" />
      <MenuBar />
      <div className="pt-8">
        <WindowManager />
      </div>
      <Dock />
      <NotificationCenter />
      <CommandPalette />
    </div>
  )
}

