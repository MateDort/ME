'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOSStore } from '@/lib/store'
import { formatResponse } from '@/lib/format-response'

interface Action {
  type: 'music' | 'video' | 'search' | 'message' | 'note'
  data: any
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actions, setActions] = useState<Action[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const lastKeyPressRef = useRef<number>(0)
  const { addWindow } = useOSStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Double press M (m+m) to open
      if (e.key === 'm' || e.key === 'M') {
        const now = Date.now()
        const timeSinceLastPress = now - lastKeyPressRef.current
        
        // If pressed within 500ms of last M press, open palette
        if (timeSinceLastPress < 500 && timeSinceLastPress > 0) {
          e.preventDefault()
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
          lastKeyPressRef.current = 0 // Reset
        } else {
          lastKeyPressRef.current = now
        }
      } else {
        // Reset if any other key is pressed
        lastKeyPressRef.current = 0
      }
      
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setInput('')
        setResponse('')
        setActions([])
        lastKeyPressRef.current = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setResponse('')
    setActions([])

    try {
      const res = await fetch('/api/quick-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thought: input }),
      })

      const data = await res.json()
      setResponse(data.response || '')
      
      if (data.actions && data.actions.length > 0) {
        setActions(data.actions)
        // Execute actions
        data.actions.forEach((action: Action) => {
          executeAction(action)
        })
      }

      setInput('')
    } catch (error) {
      console.error('Error:', error)
      setResponse('Something went wrong. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const executeAction = (action: Action) => {
    switch (action.type) {
      case 'music':
        // Open music player
        addWindow({
          id: `music-${Date.now()}`,
          title: 'Music',
          component: 'music',
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
        break
      case 'video':
        // Open search with video
        addWindow({
          id: `search-${Date.now()}`,
          title: 'Google',
          component: 'search',
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
        break
      case 'search':
        addWindow({
          id: `search-${Date.now()}`,
          title: 'Google',
          component: 'search',
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
        break
      case 'message':
        addWindow({
          id: `messages-${Date.now()}`,
          title: 'Messages',
          component: 'messages',
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
        break
      case 'note':
        addWindow({
          id: `brainstorm-${Date.now()}`,
          title: 'Brainstorm',
          component: 'brainstorm',
          x: 100,
          y: 100,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
        break
    }
  }


  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[10001] flex items-start justify-center pt-32"
        onClick={() => {
          setIsOpen(false)
          setInput('')
          setResponse('')
          setActions([])
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-white/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input */}
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">💭</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="What's on your mind?"
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-lg"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '⟳' : '→'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Press M+M to open • Esc to close</p>
          </div>

          {/* Response */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 pb-4"
            >
              <div className="bg-gray-50 rounded-xl p-4">
                <div
                  className="text-gray-700 leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-900 [&_p]:mb-2 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
                />
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin text-2xl">⏳</div>
              <p className="text-gray-500 mt-2 text-sm">Thinking...</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

