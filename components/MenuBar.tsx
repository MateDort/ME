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
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
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
      { label: 'About MEOS', action: () => alert('MEOS - My Operating System\nVersion 1.0\nBuilt with Next.js, React, and AI') },
      { label: 'System Preferences...', action: () => {} },
      { label: '---' },
      { label: 'Hide MEOS', action: () => {} },
      { label: 'Hide Others', action: () => {} },
      { label: 'Show All', action: () => {} },
      { label: '---' },
      { label: 'Quit MEOS', action: () => {} },
    ],
    file: [
      { label: 'New Window', action: () => {} },
      { label: 'New Tab', action: () => {} },
      { label: '---' },
      { label: 'Open...', action: () => {} },
      { label: 'Open Recent', action: () => {} },
      { label: '---' },
      { label: 'Close Window', action: () => {} },
      { label: 'Save', action: () => {} },
      { label: 'Save As...', action: () => {} },
    ],
    edit: [
      { label: 'Undo', action: () => {} },
      { label: 'Redo', action: () => {} },
      { label: '---' },
      { label: 'Cut', action: () => {} },
      { label: 'Copy', action: () => {} },
      { label: 'Paste', action: () => {} },
      { label: 'Select All', action: () => {} },
      { label: '---' },
      { label: 'Find', action: () => {} },
      { label: 'Find and Replace...', action: () => {} },
    ],
    help: [
      { label: 'MEOS Help', action: () => addWindow({ id: `help-${Date.now()}`, title: 'Help', component: 'help', x: 100, y: 100, width: 600, height: 400, minimized: false, maximized: false }) },
      { label: 'Keyboard Shortcuts', action: () => {} },
      { label: '---' },
      { label: 'About MEOS', action: () => alert('MEOS - My Operating System\nVersion 1.0\nBuilt with Next.js, React, and AI') },
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

  return (
    <div ref={menuRef} className="fixed top-0 left-0 right-0 h-7 bg-white border-b-2 border-black z-50 flex items-center font-mono text-sm">
      {/* Apple Logo */}
      <button
        onClick={() => handleMenuClick('apple')}
        className={`px-3 h-full hover:bg-black hover:text-white flex items-center ${activeMenu === 'apple' ? 'bg-black text-white' : ''}`}
      >
        <span className="text-base">🍎</span>
      </button>

      {/* File Menu */}
      <button
        onClick={() => handleMenuClick('file')}
        className={`px-3 h-full hover:bg-black hover:text-white font-bold ${activeMenu === 'file' ? 'bg-black text-white' : ''}`}
      >
        File
      </button>

      {/* Edit Menu */}
      <button
        onClick={() => handleMenuClick('edit')}
        className={`px-3 h-full hover:bg-black hover:text-white font-bold ${activeMenu === 'edit' ? 'bg-black text-white' : ''}`}
      >
        Edit
      </button>

      {/* Help Menu */}
      <button
        onClick={() => handleMenuClick('help')}
        className={`px-3 h-full hover:bg-black hover:text-white font-bold ${activeMenu === 'help' ? 'bg-black text-white' : ''}`}
      >
        Help
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: Time icon and clock */}
      <div className="flex items-center px-3 gap-2">
        <span className="text-base">{timeIcon}</span>
        <span className="font-mono text-xs font-bold">{currentTime}</span>
      </div>

      {/* Dropdown Menus */}
      <AnimatePresence>
        {activeMenu && menuItems[activeMenu as keyof typeof menuItems] && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute top-7 bg-white border-2 border-black shadow-[4px_4px_0_#000] min-w-[180px] py-1"
            style={{ left: activeMenu === 'apple' ? '0' : activeMenu === 'file' ? '40px' : activeMenu === 'edit' ? '85px' : '128px' }}
            onMouseLeave={() => setActiveMenu(null)}
          >
            {menuItems[activeMenu as keyof typeof menuItems].map((item, index) => {
              if (item.label === '---') {
                return <div key={index} className="h-px bg-black my-1 mx-2" />
              }
              return (
                <button
                  key={index}
                  onClick={() => handleMenuItemClick(item)}
                  className="w-full text-left px-4 py-1 hover:bg-black hover:text-white font-mono text-sm"
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
