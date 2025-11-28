'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const allApps = [
  { id: 'messages', title: 'Messages', icon: '💬', description: 'Chat with Emese AI', component: 'messages', requiresAuth: false },
  { id: 'cursor', title: 'Cursor', icon: '🖥️', description: 'Agentic coding workspace', component: 'cursor', requiresAuth: false },
  { id: 'terminal', title: 'Terminal', icon: '💻', description: 'System shell', component: 'terminal', requiresAuth: false },
  { id: 'finder', title: 'Finder', icon: '📁', description: 'File manager', component: 'finder', requiresAuth: false },
  { id: 'notion', title: 'Notion', icon: '🧱', description: 'Docs & blocks workspace', component: 'notion', requiresAuth: true },
  { id: 'calendar', title: 'Calendar', icon: '📅', description: 'Schedule & events', component: 'calendar', requiresAuth: true },
  { id: 'maps', title: 'Maps', icon: '🗺️', description: 'Navigation & places', component: 'maps', requiresAuth: true },
  { id: 'music', title: 'iTunes', icon: '🎵', description: 'Music player', component: 'music', requiresAuth: true },
  { id: 'search', title: 'Safari', icon: '🔍', description: 'Web browser', component: 'search', requiresAuth: false },
  { id: 'news', title: 'News', icon: '📰', description: 'Personalized news', component: 'news', requiresAuth: false },
  { id: 'health', title: 'Health', icon: '🏃', description: 'Health insights', component: 'health', requiresAuth: true },
  { id: 'language', title: 'Language', icon: '🌍', description: 'Learn languages', component: 'language', requiresAuth: false },
  { id: 'piano', title: 'GarageBand', icon: '🎹', description: 'Play piano', component: 'piano', requiresAuth: false },
  { id: 'skillshipping', title: 'SkillShipping', icon: '📦', description: 'Track skills', component: 'skillshipping', requiresAuth: true },
  { id: 'neuranote', title: 'NeuraNote', icon: '🧠', description: 'AI notes', component: 'neuranote', requiresAuth: true },
  { id: 'doorman', title: 'AI Doorman', icon: '🚪', description: 'Smart security', component: 'doorman', requiresAuth: true },
]

export default function AppLauncher() {
  const { windows, addWindow, isAuthenticated } = useOSStore()
  
  // Filter apps based on authentication status
  const availableApps = allApps.filter(app => !app.requiresAuth || isAuthenticated)

  const handleAppClick = (app: typeof allApps[0]) => {
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

  return (
    <div 
      className="h-full overflow-y-auto p-8"
      style={{
        background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header - Aqua style */}
        <div 
          className="px-6 py-4 mb-8 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,240,255,0.95) 100%)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
              style={{
                background: 'linear-gradient(135deg, #5195E5 0%, #3A7FD5 100%)',
                boxShadow: '0 4px 12px rgba(81,149,229,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              🚀
            </div>
            <div>
              <h1 
                className="font-bold text-2xl mb-1"
                style={{ 
                  fontFamily: '"Lucida Grande", sans-serif',
                  color: '#333',
                }}
              >
                Applications
              </h1>
              <p 
                className="text-sm"
                style={{ 
                  fontFamily: '"Lucida Grande", sans-serif',
                  color: '#666',
                }}
              >
                All available apps in your MEOS
              </p>
            </div>
          </div>
        </div>

        {/* App Grid - Classic Mac OS X style */}
        <div className="grid grid-cols-4 md:grid-cols-5 gap-6">
          {availableApps.map((app, index) => (
            <motion.button
              key={app.id}
              onClick={() => handleAppClick(app)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl group"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(240,240,255,0.4) 100%)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.6)'
                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.border = '1px solid transparent'
              }}
            >
              {/* Classic glossy icon */}
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-4xl relative"
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
                    0 4px 12px rgba(0,0,0,0.3),
                    inset 0 1px 0 rgba(255,255,255,0.9),
                    inset 0 -1px 0 rgba(0,0,0,0.2)
                  `,
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                {/* Glossy highlight */}
                <div 
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 50%)',
                  }}
                />
                <span className="relative z-10">{app.icon}</span>
              </div>
              
              {/* App title */}
              <div className="text-center">
                <div 
                  className="font-bold text-xs leading-tight"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                    textShadow: '0 1px 0 rgba(255,255,255,0.8)',
                  }}
                >
                  {app.title}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer hint */}
        <div 
          className="mt-8 px-6 py-3 rounded-xl text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(240,240,255,0.5) 100%)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        >
          <p 
            className="text-xs"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#666',
            }}
          >
            Click any app to open • Drag windows to move • Double-click title bar to maximize
          </p>
        </div>
      </div>
    </div>
  )
}
