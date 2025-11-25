'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const apps = [
  { id: 'launcher', title: 'App Launcher', icon: '🚀', component: 'launcher' },
  { id: 'messages', title: 'Messages', icon: '💬', component: 'messages' },
  { id: 'search', title: 'Google', icon: '🔍', component: 'search' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', component: 'brainstorm' },
]

export default function Dock() {
  const { windows, addWindow } = useOSStore()

  const handleAppClick = (app: typeof apps[0]) => {
    const existingWindow = windows.find((w) => w.component === app.component)
    if (existingWindow) {
      // Focus existing window
      const { setActiveWindow, updateWindow } = useOSStore.getState()
      const maxZ = Math.max(...windows.map((w) => w.zIndex), 0)
      updateWindow(existingWindow.id, { zIndex: maxZ + 1 })
      setActiveWindow(existingWindow.id)
      return
    }

    addWindow({
      id: `${app.component}-${Date.now()}`,
      title: app.title,
      component: app.component,
      x: 100 + Math.random() * 200,
      y: 40 + Math.random() * 200, // Account for menu bar (32px) + padding
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
    })
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="flex gap-2 bg-white/30 backdrop-blur-xl border border-white/40 p-2 rounded-2xl shadow-lg"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {apps.map((app) => (
          <motion.button
            key={app.id}
            onClick={() => handleAppClick(app)}
            className="w-14 h-14 bg-white/50 backdrop-blur-sm border border-white/50 hover:bg-white/70 flex items-center justify-center text-2xl rounded-xl transition-all shadow-sm"
            whileHover={{ scale: 1.15, y: -8 }}
            whileTap={{ scale: 0.95 }}
            title={app.title}
          >
            {app.icon}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}

