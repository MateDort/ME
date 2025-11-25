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
    <div className="fixed top-12 right-4 z-[10000] space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            className="bg-white/95 backdrop-blur-xl p-4 rounded-xl shadow-lg max-w-sm border border-white/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  💭 {notification.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

