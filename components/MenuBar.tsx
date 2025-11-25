'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOSStore } from '@/lib/store'

interface MenuBarProps {
  timeIcon?: string
}

export default function MenuBar({ timeIcon = '☀️' }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const { addWindow } = useOSStore()
  const menuRef = useRef<HTMLDivElement>(null)

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenu])

  const menuItems = {
    apple: [
      { label: 'About This Mac', action: () => alert('MEOS - My Operating System\nVersion 1.0\nBuilt with Next.js, React, and AI') },
      { label: '---' },
      { label: 'System Preferences...', action: () => {} },
      { label: 'App Store...', action: () => {} },
      { label: '---' },
      { label: 'Recent Items', action: () => {} },
      { label: '---' },
      { label: 'Force Quit...', action: () => {} },
      { label: '---' },
      { label: 'Sleep', action: () => {} },
      { label: 'Restart...', action: () => {} },
      { label: 'Shut Down...', action: () => {} },
    ],
    finder: [
      { label: 'About Finder', action: () => {} },
      { label: '---' },
      { label: 'Preferences...', action: () => {} },
      { label: '---' },
      { label: 'Empty Trash...', action: () => {} },
    ],
    file: [
      { label: 'New Finder Window', action: () => {} },
      { label: 'New Folder', action: () => {} },
      { label: '---' },
      { label: 'Open', action: () => {} },
      { label: 'Open With', action: () => {} },
      { label: '---' },
      { label: 'Close Window', action: () => {} },
      { label: '---' },
      { label: 'Get Info', action: () => {} },
    ],
    edit: [
      { label: 'Undo', action: () => {} },
      { label: 'Redo', action: () => {} },
      { label: '---' },
      { label: 'Cut', action: () => {} },
      { label: 'Copy', action: () => {} },
      { label: 'Paste', action: () => {} },
      { label: 'Select All', action: () => {} },
    ],
    view: [
      { label: 'as Icons', action: () => {} },
      { label: 'as List', action: () => {} },
      { label: 'as Columns', action: () => {} },
      { label: '---' },
      { label: 'Show Path Bar', action: () => {} },
      { label: 'Show Status Bar', action: () => {} },
    ],
    go: [
      { label: 'Back', action: () => {} },
      { label: 'Forward', action: () => {} },
      { label: '---' },
      { label: 'Computer', action: () => {} },
      { label: 'Home', action: () => {} },
      { label: 'Desktop', action: () => {} },
      { label: 'Downloads', action: () => {} },
      { label: 'Applications', action: () => {} },
    ],
    window: [
      { label: 'Minimize', action: () => {} },
      { label: 'Zoom', action: () => {} },
      { label: '---' },
      { label: 'Bring All to Front', action: () => {} },
    ],
    help: [
      { label: 'MEOS Help', action: () => addWindow({ id: `help-${Date.now()}`, title: 'Help', component: 'help', x: 100, y: 100, width: 600, height: 400, minimized: false, maximized: false }) },
      { label: '---' },
      { label: 'Search', action: () => {} },
    ],
  }

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu)
  }

  const handleMenuItemClick = (item: { label: string; action?: () => void }) => {
    if (item.action) {
      item.action()
    }
    setActiveMenu(null)
  }

  const menuOrder = ['apple', 'finder', 'file', 'edit', 'view', 'go', 'window', 'help']
  
  const getMenuPosition = (menu: string) => {
    switch(menu) {
      case 'apple': return '0px'
      case 'finder': return '30px'
      case 'file': return '85px'
      case 'edit': return '120px'
      case 'view': return '155px'
      case 'go': return '195px'
      case 'window': return '225px'
      case 'help': return '285px'
      default: return '0'
    }
  }

  return (
    <div 
      ref={menuRef} 
      className="fixed top-0 left-0 right-0 h-6 bg-white/80 backdrop-blur-xl z-50 flex items-center shadow-sm border-b border-black/5"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
    >
      {/* Apple Logo */}
      <button
        onClick={() => handleMenuClick('apple')}
        className={`px-3 h-full hover:bg-black/5 flex items-center ${activeMenu === 'apple' ? 'bg-black/10' : ''}`}
      >
        <span className="text-sm opacity-80">🍎</span>
      </button>

      {/* Finder */}
      <button
        onClick={() => handleMenuClick('finder')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] font-semibold ${activeMenu === 'finder' ? 'bg-black/10' : ''}`}
      >
        Finder
      </button>

      {/* File Menu */}
      <button
        onClick={() => handleMenuClick('file')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'file' ? 'bg-black/10' : ''}`}
      >
        File
      </button>

      {/* Edit Menu */}
      <button
        onClick={() => handleMenuClick('edit')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'edit' ? 'bg-black/10' : ''}`}
      >
        Edit
      </button>

      {/* View Menu */}
      <button
        onClick={() => handleMenuClick('view')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'view' ? 'bg-black/10' : ''}`}
      >
        View
      </button>

      {/* Go Menu */}
      <button
        onClick={() => handleMenuClick('go')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'go' ? 'bg-black/10' : ''}`}
      >
        Go
      </button>

      {/* Window Menu */}
      <button
        onClick={() => handleMenuClick('window')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'window' ? 'bg-black/10' : ''}`}
      >
        Window
      </button>

      {/* Help Menu */}
      <button
        onClick={() => handleMenuClick('help')}
        className={`px-2 h-full hover:bg-black/5 text-[13px] ${activeMenu === 'help' ? 'bg-black/10' : ''}`}
      >
        Help
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Status icons and clock */}
      <div className="flex items-center px-3 gap-3 text-[13px]">
        <span className="opacity-70">{timeIcon}</span>
        <span className="opacity-80">{currentTime}</span>
      </div>

      {/* Dropdown Menus */}
      <AnimatePresence>
        {activeMenu && menuItems[activeMenu as keyof typeof menuItems] && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute top-6 bg-white/95 backdrop-blur-xl rounded-md shadow-xl min-w-[220px] py-1 border border-black/10"
            style={{ left: getMenuPosition(activeMenu) }}
            onMouseLeave={() => setActiveMenu(null)}
          >
            {menuItems[activeMenu as keyof typeof menuItems].map((item, index) => {
              if (item.label === '---') {
                return <div key={index} className="h-px bg-black/10 my-1 mx-3" />
              }
              return (
                <button
                  key={index}
                  onClick={() => handleMenuItemClick(item)}
                  className="w-full text-left px-3 py-1 hover:bg-blue-500 hover:text-white text-[13px] transition-colors"
                >
                  {item.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
