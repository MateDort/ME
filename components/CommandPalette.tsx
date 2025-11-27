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
  const [widgets, setWidgets] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const lastKeyPressRef = useRef<number>(0)
  const { addWindow, addEmeseMessage, windows, updateWindow, closeWindow } = useOSStore()

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

    const userMessage = input.trim()
    setIsLoading(true)
    setResponse('')
    setActions([])
    setWidgets([])

    // Add user message to Emese chat in Messages app
    addEmeseMessage({
      id: `user-${Date.now()}`,
      text: userMessage,
      sender: 'me',
      timestamp: new Date(),
    })

    try {
      // Build context about current OS state
      const context = {
        openApps: windows.map(w => w.component),
        time: new Date().toISOString(),
      }

      const res = await fetch('/api/emese', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          context 
        }),
      })

      const data = await res.json()
      const responseText = data.message || data.response || ''
      const responseActions = data.actions || []
      const responseWidgets = data.widgets || []
      
      setResponse(responseText)
      setActions(responseActions)
      setWidgets(responseWidgets)
      
      // Add assistant response to Emese chat in Messages app
      addEmeseMessage({
        id: `assistant-${Date.now()}`,
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        actions: responseActions,
        widgets: responseWidgets,
      })

      // Execute actions
      if (responseActions && responseActions.length > 0) {
        responseActions.forEach((action: any) => {
          executeAction(action)
        })
      }

      setInput('')
    } catch (error) {
      console.error('Error:', error)
      setResponse('Something went wrong. Try again.')
      
      // Add error message to chat
      addEmeseMessage({
        id: `error-${Date.now()}`,
        text: 'Sorry, I had trouble processing that. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const executeAction = (action: any) => {
    const appMap: Record<string, { title: string; component: string }> = {
      music: { title: 'iTunes', component: 'music' },
      search: { title: 'Safari', component: 'search' },
      messages: { title: 'Messages', component: 'messages' },
      cursor: { title: 'Cursor', component: 'cursor' },
      brainstorm: { title: 'Cursor', component: 'cursor' },
      calendar: { title: 'Calendar', component: 'calendar' },
      maps: { title: 'Maps', component: 'maps' },
      news: { title: 'News', component: 'news' },
      health: { title: 'Health', component: 'health' },
      finder: { title: 'Finder', component: 'finder' },
      notion: { title: 'Notion', component: 'notion' },
      launcher: { title: 'Launchpad', component: 'launcher' },
    }

    switch (action.type) {
      case 'open_app': {
        const appInfo = appMap[action.app]
        if (appInfo) {
          const existingWindow = windows.find(w => w.component === appInfo.component)
          if (!existingWindow) {
            addWindow({
              id: `${appInfo.component}-${Date.now()}`,
              title: appInfo.title,
              component: appInfo.component,
              x: 100 + Math.random() * 100,
              y: 100 + Math.random() * 100,
              width: 800,
              height: 600,
              minimized: false,
              maximized: false,
            })
          }
        }
        break
      }
      case 'close_app': {
        const appInfo = appMap[action.app]
        if (appInfo) {
          const windowToClose = windows.find(w => w.component === appInfo.component)
          if (windowToClose) {
            closeWindow(windowToClose.id)
          }
        }
        break
      }
      case 'minimize_app': {
        const appInfo = appMap[action.app]
        if (appInfo) {
          const windowToMinimize = windows.find(w => w.component === appInfo.component)
          if (windowToMinimize) {
            updateWindow(windowToMinimize.id, { minimized: true })
          }
        }
        break
      }
      case 'maximize_app': {
        const appInfo = appMap[action.app]
        if (appInfo) {
          const windowToMaximize = windows.find(w => w.component === appInfo.component)
          if (windowToMaximize) {
            updateWindow(windowToMaximize.id, { maximized: true })
          }
        }
        break
      }
      case 'play_music':
      case 'pause_music':
      case 'skip_track':
      case 'previous_track':
        // These will be handled by the Music app directly
        console.log('Music control:', action.type)
        break
      // Legacy support
      case 'music':
      case 'video':
      case 'search':
      case 'message':
      case 'note':
        const legacyMap: Record<string, string> = {
          music: 'music',
          video: 'search',
          search: 'search',
          message: 'messages',
          note: 'cursor',
        }
        const legacyApp = legacyMap[action.type]
        if (legacyApp && appMap[legacyApp]) {
          const appInfo = appMap[legacyApp]
          addWindow({
            id: `${appInfo.component}-${Date.now()}`,
            title: appInfo.title,
            component: appInfo.component,
            x: 100,
            y: 100,
            width: 800,
            height: 600,
            minimized: false,
            maximized: false,
          })
        }
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
