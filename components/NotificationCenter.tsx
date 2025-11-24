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
    <div className="fixed top-4 right-4 z-[10000] space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="bg-gray-900 border-2 border-retro-yellow p-4 rounded-lg shadow-lg max-w-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-retro-yellow mb-1">
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-300">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-500 hover:text-white ml-2"
              >
                ×
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

