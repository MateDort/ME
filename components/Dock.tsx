'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const apps = [
  { id: 'launcher', title: 'App Launcher', icon: '🚀', component: 'launcher' },
  { id: 'messages', title: 'Messages', icon: '💬', component: 'messages' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', component: 'brainstorm' },
  { id: 'calendar', title: 'Calendar', icon: '📅', component: 'calendar' },
  { id: 'search', title: 'Google', icon: '🔍', component: 'search' },
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
      y: 40 + Math.random() * 200,
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
    })
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="flex gap-1 bg-[#e8e8e8] border-2 border-black p-2 shadow-[4px_4px_0_#000]"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {apps.map((app) => (
          <motion.button
            key={app.id}
            onClick={() => handleAppClick(app)}
            className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center text-xl shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all"
            whileHover={{ scale: 1.1, y: -4 }}
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
