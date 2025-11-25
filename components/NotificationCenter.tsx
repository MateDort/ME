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
    <div className="fixed top-8 right-4 z-[10000] space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            className="max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,255,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #B57BEE 0%, #E067C8 100%)',
                      boxShadow: '0 2px 8px rgba(181,123,238,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}
                  >
                    ✨
                  </div>
                  <div>
                    <h3 
                      className="font-semibold text-sm"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: '#333',
                      }}
                    >
                      {notification.title}
                    </h3>
                    <p 
                      className="text-sm mt-1"
                      style={{ 
                        fontFamily: '"Lucida Grande", sans-serif',
                        color: '#666',
                      }}
                    >
                      {notification.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
