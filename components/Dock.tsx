'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const apps = [
  { id: 'launcher', title: 'Launchpad', icon: '🚀', component: 'launcher' },
  { id: 'messages', title: 'Messages', icon: '💬', component: 'messages' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', component: 'brainstorm' },
  { id: 'calendar', title: 'Calendar', icon: '📅', component: 'calendar' },
  { id: 'music', title: 'Music', icon: '🎵', component: 'music' },
  { id: 'search', title: 'Safari', icon: '🔍', component: 'search' },
  { id: 'news', title: 'News', icon: '📰', component: 'news' },
]

export default function Dock() {
  const { windows, addWindow } = useOSStore()

  const handleAppClick = (app: typeof apps[0]) => {
    const existingWindow = windows.find((w) => w.component === app.component)
    if (existingWindow) {
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

  // Check if app window is open
  const isAppOpen = (component: string) => windows.some(w => w.component === component)

  return (
    <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        className="flex gap-1 px-2 py-1.5 rounded-2xl"
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      >
        {apps.map((app) => (
          <motion.button
            key={app.id}
            onClick={() => handleAppClick(app)}
            className="relative w-12 h-12 flex items-center justify-center text-2xl rounded-xl"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
            whileHover={{ 
              scale: 1.2, 
              y: -10,
              transition: { type: 'spring', stiffness: 400, damping: 17 }
            }}
            whileTap={{ scale: 0.95 }}
            title={app.title}
          >
            {app.icon}
            {/* Active indicator dot */}
            {isAppOpen(app.component) && (
              <motion.div
                className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{ boxShadow: '0 0 4px rgba(255,255,255,0.8)' }}
              />
            )}
          </motion.button>
        ))}
        
        {/* Separator */}
        <div className="w-px bg-white/20 mx-1 my-2" />
        
        {/* Trash */}
        <motion.button
          className="w-12 h-12 flex items-center justify-center text-2xl rounded-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
          whileHover={{ 
            scale: 1.2, 
            y: -10,
            transition: { type: 'spring', stiffness: 400, damping: 17 }
          }}
          whileTap={{ scale: 0.95 }}
          title="Trash"
        >
          🗑️
        </motion.button>
      </motion.div>
    </div>
  )
}
