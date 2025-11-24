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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10001] flex items-center justify-center"
        onClick={() => {
          setIsOpen(false)
          setInput('')
          setResponse('')
          setActions([])
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 border-2 border-retro-yellow rounded-lg shadow-2xl w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-retro-yellow text-black px-6 py-4 border-b-2 border-black">
            <h2 className="text-xl font-bold">💭 Share Your Thought</h2>
            <p className="text-sm mt-1">Press M+M to open • Esc to close</p>
          </div>

          {/* Input */}
          <div className="p-6">
            <div className="flex gap-2 mb-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="What's on your mind? (e.g., 'play music', 'show me F1 news', 'I want to build something')"
                className="flex-1 px-4 py-3 bg-gray-800 border-2 border-retro-blue rounded text-white placeholder-gray-500 focus:outline-none focus:border-retro-yellow"
              />
              <button
                onClick={handleSubmit}
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-retro-green text-black rounded font-bold hover:bg-retro-purple disabled:opacity-50"
              >
                {isLoading ? '⟳' : '→'}
              </button>
            </div>

            {/* Response */}
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-4 border-2 border-retro-blue"
              >
                <div
                  className="text-white leading-relaxed [&_strong]:font-bold [&_strong]:text-retro-yellow [&_p]:mb-3 [&_p:last-child]:mb-0"
                  style={{ fontFamily: 'inherit' }}
                  dangerouslySetInnerHTML={{ __html: formatResponse(response) }}
                />
              </motion.div>
            )}

            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin text-2xl">⟳</div>
                <p className="text-gray-400 mt-2">Thinking...</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

