'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const apps = [
  { id: 'launcher', title: 'Launchpad', icon: '🚀', component: 'launcher' },
  { id: 'messages', title: 'Messages', icon: '💬', component: 'messages' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', component: 'brainstorm' },
  { id: 'calendar', title: 'Calendar', icon: '📅', component: 'calendar' },
  { id: 'music', title: 'iTunes', icon: '🎵', component: 'music' },
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

  const isAppOpen = (component: string) => windows.some(w => w.component === component)

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 pb-1">
      {/* Classic 3D dock shelf */}
      <div 
        className="relative px-3 pt-3 pb-2"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.3) 50%, rgba(200,200,255,0.4) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderBottom: 'none',
        }}
      >
        <motion.div
          className="flex gap-2 items-end"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          {apps.map((app, index) => (
            <motion.button
              key={app.id}
              onClick={() => handleAppClick(app)}
              className="relative flex flex-col items-center justify-end"
              style={{
                width: '56px',
                height: '56px',
              }}
              whileHover={{ 
                scale: 1.4, 
                y: -20,
                transition: { type: 'spring', stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 1.0 }}
              title={app.title}
            >
              {/* Classic 3D icon with glossy effect */}
              <div 
                className="w-full h-full rounded-xl flex items-center justify-center text-3xl relative"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(255,255,255,0.9) 0%, 
                      rgba(240,240,255,0.8) 40%,
                      rgba(200,200,255,0.7) 60%,
                      rgba(180,180,240,0.8) 100%
                    )
                  `,
                  boxShadow: `
                    0 4px 12px rgba(0,0,0,0.4),
                    inset 0 1px 0 rgba(255,255,255,0.9),
                    inset 0 -1px 0 rgba(0,0,0,0.2)
                  `,
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                {/* Glossy highlight overlay */}
                <div 
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                  }}
                />
                <span className="relative z-10">{app.icon}</span>
              </div>
              
              {/* Active indicator - classic white dot */}
              {isAppOpen(app.component) && (
                <motion.div
                  className="absolute -bottom-1 w-1.5 h-1.5 bg-white rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{ 
                    boxShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.5)',
                  }}
                />
              )}
            </motion.button>
          ))}
          
          {/* Separator */}
          <div 
            className="w-px h-12 mx-1 self-end mb-1"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.5), transparent)',
            }}
          />
          
          {/* Trash - classic style */}
          <motion.button
            className="relative flex flex-col items-center justify-end"
            style={{
              width: '56px',
              height: '56px',
            }}
            whileHover={{ 
              scale: 1.4, 
              y: -20,
              transition: { type: 'spring', stiffness: 400, damping: 17 }
            }}
            whileTap={{ scale: 1.0 }}
            title="Trash"
          >
            <div 
              className="w-full h-full rounded-xl flex items-center justify-center text-3xl relative"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(255,255,255,0.9) 0%, 
                    rgba(240,240,255,0.8) 40%,
                    rgba(200,200,255,0.7) 60%,
                    rgba(180,180,240,0.8) 100%
                  )
                `,
                boxShadow: `
                  0 4px 12px rgba(0,0,0,0.4),
                  inset 0 1px 0 rgba(255,255,255,0.9),
                  inset 0 -1px 0 rgba(0,0,0,0.2)
                `,
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                }}
              />
              <span className="relative z-10">🗑️</span>
            </div>
          </motion.button>
        </motion.div>

        {/* 3D shelf effect at bottom */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-2 rounded-b-xl"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.1))',
          }}
        />
      </div>
    </div>
  )
}
