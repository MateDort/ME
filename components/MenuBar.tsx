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
      { label: 'Dock', action: () => {} },
      { label: '---' },
      { label: 'Recent Items', action: () => {} },
      { label: 'Force Quit...', action: () => {} },
      { label: '---' },
      { label: 'Sleep', action: () => {} },
      { label: 'Restart...', action: () => {} },
      { label: 'Shut Down...', action: () => {} },
      { label: '---' },
      { label: 'Log Out...', action: () => {} },
    ],
    finder: [
      { label: 'About Finder', action: () => {} },
      { label: '---' },
      { label: 'Preferences...', action: () => {} },
      { label: '---' },
      { label: 'Empty Trash...', action: () => {} },
      { label: 'Secure Empty Trash...', action: () => {} },
    ],
    file: [
      { label: 'New Finder Window', action: () => {} },
      { label: 'New Folder', action: () => {} },
      { label: 'New Smart Folder', action: () => {} },
      { label: 'New Burn Folder', action: () => {} },
      { label: '---' },
      { label: 'Open', action: () => {} },
      { label: 'Open With', action: () => {} },
      { label: 'Close Window', action: () => {} },
      { label: '---' },
      { label: 'Get Info', action: () => {} },
      { label: 'Duplicate', action: () => {} },
      { label: 'Make Alias', action: () => {} },
      { label: 'Show Original', action: () => {} },
      { label: 'Add to Favorites', action: () => {} },
      { label: '---' },
      { label: 'Move to Trash', action: () => {} },
      { label: 'Burn Disc...', action: () => {} },
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
      { label: 'Clean Up', action: () => {} },
      { label: 'Arrange By', action: () => {} },
      { label: '---' },
      { label: 'Show View Options', action: () => {} },
    ],
    go: [
      { label: 'Back', action: () => {} },
      { label: 'Forward', action: () => {} },
      { label: 'Enclosing Folder', action: () => {} },
      { label: '---' },
      { label: 'Computer', action: () => {} },
      { label: 'Home', action: () => {} },
      { label: 'iDisk', action: () => {} },
      { label: 'Applications', action: () => {} },
      { label: 'Recent Folders', action: () => {} },
      { label: '---' },
      { label: 'Go to Folder...', action: () => {} },
    ],
    window: [
      { label: 'Minimize Window', action: () => {} },
      { label: 'Zoom Window', action: () => {} },
      { label: '---' },
      { label: 'Bring All to Front', action: () => {} },
    ],
    help: [
      { label: 'Mac Help', action: () => addWindow({ id: `help-${Date.now()}`, title: 'Help', component: 'help', x: 100, y: 100, width: 600, height: 400, minimized: false, maximized: false }) },
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
      className="fixed top-0 left-0 right-0 h-6 z-50 flex items-center text-white font-bold"
      style={{ 
        background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(200,200,255,0.3) 50%, rgba(150,150,220,0.4) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
        fontFamily: '"Lucida Grande", sans-serif',
        fontSize: '13px',
        textShadow: '0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      {/* Apple Logo */}
      <button
        onClick={() => handleMenuClick('apple')}
        className={`px-2 h-full flex items-center ${activeMenu === 'apple' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        <span className="text-base">🍎</span>
      </button>

      {/* Finder */}
      <button
        onClick={() => handleMenuClick('finder')}
        className={`px-2 h-full ${activeMenu === 'finder' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        Finder
      </button>

      {/* File */}
      <button
        onClick={() => handleMenuClick('file')}
        className={`px-2 h-full ${activeMenu === 'file' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        File
      </button>

      {/* Edit */}
      <button
        onClick={() => handleMenuClick('edit')}
        className={`px-2 h-full ${activeMenu === 'edit' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        Edit
      </button>

      {/* View */}
      <button
        onClick={() => handleMenuClick('view')}
        className={`px-2 h-full ${activeMenu === 'view' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        View
      </button>

      {/* Go */}
      <button
        onClick={() => handleMenuClick('go')}
        className={`px-2 h-full ${activeMenu === 'go' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        Go
      </button>

      {/* Window */}
      <button
        onClick={() => handleMenuClick('window')}
        className={`px-2 h-full ${activeMenu === 'window' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        Window
      </button>

      {/* Help */}
      <button
        onClick={() => handleMenuClick('help')}
        className={`px-2 h-full ${activeMenu === 'help' ? 'bg-white/30' : 'hover:bg-white/20'}`}
      >
        Help
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center px-3 gap-2">
        <span>{timeIcon}</span>
        <span className="text-xs">{currentTime}</span>
      </div>

      {/* Dropdown Menus - Classic Aqua style */}
      <AnimatePresence>
        {activeMenu && menuItems[activeMenu as keyof typeof menuItems] && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute top-6 rounded-lg min-w-[220px] py-2"
            style={{ 
              left: getMenuPosition(activeMenu),
              background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
            onMouseLeave={() => setActiveMenu(null)}
          >
            {menuItems[activeMenu as keyof typeof menuItems].map((item, index) => {
              if (item.label === '---') {
                return (
                  <div 
                    key={index} 
                    className="h-px my-1 mx-3"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.2), transparent)',
                    }}
                  />
                )
              }
              return (
                <button
                  key={index}
                  onClick={() => handleMenuItemClick(item)}
                  className="w-full text-left px-4 py-1 text-sm"
                  style={{
                    color: '#333',
                    fontFamily: '"Lucida Grande", sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)'
                    e.currentTarget.style.color = 'white'
                    e.currentTarget.style.textShadow = '0 -1px 0 rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#333'
                    e.currentTarget.style.textShadow = 'none'
                  }}
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
