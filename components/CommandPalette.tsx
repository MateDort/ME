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
      if (e.key === 'm' || e.key === 'M') {
        const now = Date.now()
        const timeSinceLastPress = now - lastKeyPressRef.current
        
        if (timeSinceLastPress < 500 && timeSinceLastPress > 0) {
          e.preventDefault()
          setIsOpen(true)
          setTimeout(() => inputRef.current?.focus(), 100)
          lastKeyPressRef.current = 0
        } else {
          lastKeyPressRef.current = now
        }
      } else {
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
      case 'search':
        addWindow({
          id: `search-${Date.now()}`,
          title: 'Safari',
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
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[10001] flex items-start justify-center pt-32"
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
          className="w-full max-w-xl mx-4 overflow-hidden rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input */}
          <div className="p-4">
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 text-xl">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask Emese anything..."
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none text-lg"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isLoading ? '...' : 'Ask'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Press M+M to open • Esc to close</p>
          </div>

          {/* Response */}
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 pb-4 border-t border-gray-200/50"
            >
              <div className="bg-gray-50/80 rounded-lg p-4 mt-4">
                <div
                  className="text-gray-700 leading-relaxed text-sm"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
                  dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
                />
              </div>
            </motion.div>
          )}

          {isLoading && (
            <div className="text-center py-4 border-t border-gray-200/50">
              <div className="inline-block animate-spin text-2xl">⏳</div>
              <p className="text-gray-500 mt-2 text-sm">Thinking...</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
