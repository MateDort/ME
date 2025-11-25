'use client'

import { useOSStore } from '@/lib/store'
import { motion } from 'framer-motion'

const allApps = [
  { id: 'messages', title: 'Messages', icon: '💬', description: 'Chat with Emese AI', component: 'messages' },
  { id: 'brainstorm', title: 'Brainstorm', icon: '💡', description: 'Code generation & projects', component: 'brainstorm' },
  { id: 'calendar', title: 'Calendar', icon: '📅', description: 'Schedule & events', component: 'calendar' },
  { id: 'maps', title: 'Maps', icon: '🗺️', description: 'Navigation & places', component: 'maps' },
  { id: 'music', title: 'Music', icon: '🎵', description: 'iPod-style music player', component: 'music' },
  { id: 'search', title: 'Google', icon: '🔍', description: 'AI-powered search', component: 'search' },
  { id: 'news', title: 'News', icon: '📰', description: 'Personalized news', component: 'news' },
  { id: 'health', title: 'Health', icon: '🏃', description: 'Health insights', component: 'health' },
  { id: 'language', title: 'Language', icon: '🌍', description: 'Learn Spanish, Italian, French', component: 'language' },
  { id: 'piano', title: 'Piano', icon: '🎹', description: 'Play piano with keyboard', component: 'piano' },
  { id: 'skillshipping', title: 'SkillShipping', icon: '📦', description: 'Track your skills', component: 'skillshipping' },
  { id: 'neuranote', title: 'NeuraNote', icon: '🧠', description: 'AI-powered notes', component: 'neuranote' },
  { id: 'doorman', title: 'AI Doorman', icon: '🚪', description: 'Smart home security', component: 'doorman' },
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
      y: 40 + Math.random() * 200,
      width: 800,
      height: 600,
      minimized: false,
      maximized: false,
    })
  }

  return (
    <div className="h-full bg-[#f5f0e6] overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-[#2a2a2a] text-white px-4 py-3 mb-6 border-2 border-black shadow-[4px_4px_0_#000]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="font-mono font-bold text-lg">MEOS Applications</h1>
              <p className="font-mono text-xs text-[#aaa]">All available apps in your system</p>
            </div>
          </div>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
          {allApps.map((app) => (
            <motion.button
              key={app.id}
              onClick={() => handleAppClick(app)}
              className="bg-white border-2 border-black shadow-[3px_3px_0_#000] p-4 text-center transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {app.icon}
              </div>
              <h3 className="font-mono font-bold text-sm mb-1">{app.title}</h3>
              <p className="font-mono text-xs text-[#666] leading-tight">{app.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 bg-[#e8e8e8] border-2 border-black p-3 shadow-[3px_3px_0_#000]">
          <p className="font-mono text-xs text-center text-[#666]">
            Click any app to open • Double-click title bar to maximize
          </p>
        </div>
      </div>
    </div>
  )
}
