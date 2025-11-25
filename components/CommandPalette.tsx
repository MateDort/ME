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
          className="w-full max-w-xl mx-4 overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,255,0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input - Aqua style */}
          <div 
            className="p-4"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.9) 100%)',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex gap-3 items-center">
              <span className="text-gray-400 text-xl">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Ask Emese anything..."
                className="flex-1 bg-transparent placeholder-gray-400 focus:outline-none text-lg"
                style={{ 
                  fontFamily: '"Lucida Grande", sans-serif',
                  color: '#333',
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                style={{
                  background: isLoading || !input.trim() 
                    ? 'linear-gradient(180deg, #ccc 0%, #aaa 100%)' 
                    : 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
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
              <div 
                className="rounded-lg p-4 mt-4"
                style={{
                  background: 'linear-gradient(180deg, rgba(240,240,255,0.5) 0%, rgba(230,230,250,0.5) 100%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <div
                  className="leading-relaxed text-sm"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: '#333',
                  }}
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
