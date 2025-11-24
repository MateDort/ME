'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const allApps = [
  { id: 'messages', title: 'Messages', icon: '💬', description: 'Chat with yourself', component: 'messages' },
  { id: 'music', title: 'Music', icon: '🎵', description: 'iPod-style music player', component: 'music' },
  { id: 'search', title: 'Google', icon: '🔍', description: 'AI-powered search', component: 'search' },
  { id: 'news', title: 'News', icon: '📰', description: 'Personalized news', component: 'news' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', description: 'Code generation & projects', component: 'brainstorm' },
  { id: 'builder', title: 'Builder', icon: '🔧', description: 'Edit MEOS itself', component: 'builder' },
  { id: 'health', title: 'Health', icon: '🏃', description: 'Health insights', component: 'health' },
  { id: 'launcher', title: 'App Launcher', icon: '🚀', description: 'View all apps', component: 'launcher' },
]

export default function AppLauncher() {
  const { windows, addWindow } = useOSStore()

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
      y: 40 + Math.random() * 200, // Account for menu bar (32px) + padding
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
    })
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">MEOS Applications</h1>
          <p className="text-gray-400 text-lg">All available apps in your operating system</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allApps.map((app) => (
            <motion.button
              key={app.id}
              onClick={() => handleAppClick(app)}
              className="bg-gray-800 border-2 border-retro-blue hover:border-retro-yellow rounded-lg p-6 text-center transition-all group"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                {app.icon}
              </div>
              <h3 className="font-bold text-xl mb-2">{app.title}</h3>
              <p className="text-sm text-gray-400">{app.description}</p>
            </motion.button>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-500">
          <p>Click any app to open it</p>
        </div>
      </div>
    </div>
  )
}

