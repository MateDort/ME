'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOSStore } from '@/lib/store'

export default function NotificationCenter() {
  const { notifications, removeNotification } = useOSStore()

  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        removeNotification(notification.id)
      }, 5000)
      return () => clearTimeout(timer)
    })
  }, [notifications, removeNotification])

  return (
    <div className="fixed top-10 right-4 z-[10000] space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            className="bg-white border-2 border-black shadow-[4px_4px_0_#000] max-w-sm"
          >
            {/* Classic Mac notification header */}
            <div className="bg-white border-b-2 border-black px-2 py-1 flex items-center relative">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="h-[2px] bg-black" 
                    style={{ marginTop: i === 0 ? '2px' : '2px' }}
                  />
                ))}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="w-3 h-3 border border-black bg-white hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold mr-2 relative z-10"
              >
                ×
              </button>
              <span className="bg-white px-1 font-mono text-xs font-bold relative z-10">
                ✨ {notification.title}
              </span>
            </div>
            <div className="p-3 bg-[#f5f0e6]">
              <p className="font-mono text-sm">
                {notification.message}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
