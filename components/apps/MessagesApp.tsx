'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOSStore } from '@/lib/store'

interface Message {
  id: string
  text: string
  sender: 'me' | 'assistant'
  timestamp: Date
}

interface Chat {
  id: string
  name: string
  icon: string
  messages: Message[]
  description: string
}

const INITIAL_CHATS: Chat[] = [
  {
    id: 'me',
    name: '@Me',
    icon: '💭',
    description: 'Journal & self-reflection',
    messages: [
      {
        id: '1',
        text: 'This is your personal journal. Talk to yourself, reflect on your day, or just jot down thoughts.',
        sender: 'assistant',
        timestamp: new Date(),
      },
    ],
  },
  {
    id: 'emese',
    name: 'Emese',
    icon: '✨',
    description: 'Your AI assistant',
    messages: [
      {
        id: '1',
        text: "Hello! I'm Emese, your AI assistant. I can help you with anything - open apps, answer questions, summarize data, or just chat. What would you like to do?",
        sender: 'assistant',
        timestamp: new Date(),
      },
    ],
  },
]

export default function MessagesApp() {
  const [activeChatId, setActiveChatId] = useState('emese')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { 
    addWindow, 
    windows, 
    emeseMessages, 
    meMessages, 
    addEmeseMessage, 
    addMeMessage,
    updateWindow,
    closeWindow
  } = useOSStore()

  // Initialize chats if empty
  useEffect(() => {
    if (emeseMessages.length === 0) {
      addEmeseMessage({
        id: '1',
        text: "Hello! I'm Emese, your AI assistant with full control over MEOS. I can open apps, control music, check your health data, manage your calendar, and much more. What would you like to do?",
        sender: 'assistant',
        timestamp: new Date(),
      })
    }
    if (meMessages.length === 0) {
      addMeMessage({
        id: '1',
        text: 'This is your personal space for self-reflection and journaling. Talk to yourself as Máté - ask questions, work through problems, or just think out loud.',
        sender: 'assistant',
        timestamp: new Date(),
      })
    }
  }, [])

  const activeMessages = activeChatId === 'emese' ? emeseMessages : meMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeMessages])

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
      skillshipping: { title: 'SkillShipping', component: 'skillshipping' },
      neuranote: { title: 'NeuraNote', component: 'neuranote' },
      doorman: { title: 'AI Doorman', component: 'doorman' },
      piano: { title: 'GarageBand', component: 'piano' },
      language: { title: 'Language', component: 'language' },
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
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userInput = input.trim()
    const addMessage = activeChatId === 'emese' ? addEmeseMessage : addMeMessage

    // Add user message
    addMessage({
      id: `user-${Date.now()}`,
      text: userInput,
      sender: 'me',
      timestamp: new Date(),
    })

    setInput('')
    setIsLoading(true)

    try {
      let responseText: string = ''
      let actions: any[] = []
      let widgets: any[] = []

      if (activeChatId === 'me') {
        // @Me agent - acts as Máté for self-reflection
        const res = await fetch('/api/emese', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: `You are Máté, talking to yourself. This is self-reflection. The user said: "${userInput}". Respond as if you're having an internal dialogue with yourself - thoughtful, honest, and introspective.`,
            context: { mode: 'self-reflection' }
          }),
        })
        const data = await res.json()
        responseText = data.message || data.response || "Hmm, let me think about that..."
      } else {
        // Emese agent - full OS control
        const context = {
          openApps: windows.map(w => ({ component: w.component, title: w.title })),
          time: new Date().toISOString(),
          activeChatId,
        }

        const res = await fetch('/api/emese', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userInput,
            context 
          }),
        })
        const data = await res.json()
        responseText = data.message || data.response || "Let me think about that..."
        actions = data.actions || []
        widgets = data.widgets || []

        // Execute actions
        if (actions.length > 0) {
          actions.forEach((action: any) => {
            executeAction(action)
          })
        }
      }

      // Add assistant response
      addMessage({
        id: `assistant-${Date.now()}`,
        text: responseText,
        sender: 'assistant',
        timestamp: new Date(),
        actions,
        widgets,
      })
    } catch (error) {
      console.error('Error getting response:', error)
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: "Sorry, I couldn't process that. Please try again.",
        sender: 'assistant' as const,
        timestamp: new Date(),
      }
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const chats = [
    {
      id: 'me',
      name: '@Me',
      icon: '💭',
      description: 'Self-reflection & journaling',
      messages: meMessages,
    },
    {
      id: 'emese',
      name: 'Emese',
      icon: '✨',
      description: 'Your AI assistant',
      messages: emeseMessages,
    },
  ]

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[1]

  return (
    <div className="h-full flex">
      <div 
        className="w-60 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
        }}
      >
        <div 
          className="px-4 py-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(240,240,255,0.8) 100%)',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <h2 
              className="font-bold text-base"
              style={{ 
                fontFamily: '"Lucida Grande", sans-serif',
                color: '#333',
              }}
            >
              Messages
            </h2>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className="w-full text-left px-3 py-3 transition-all"
              style={{
                background: activeChatId === chat.id 
                  ? 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)'
                  : 'transparent',
                borderTop: activeChatId === chat.id ? '1px solid rgba(255,255,255,0.3)' : 'none',
                borderBottom: activeChatId === chat.id ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.05)',
              }}
              onMouseEnter={(e) => {
                if (activeChatId !== chat.id) {
                  e.currentTarget.style.background = 'rgba(81,149,229,0.1)'
                  e.currentTarget.style.transform = 'translateX(2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (activeChatId !== chat.id) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.transform = 'translateX(0)'
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{
                    background: activeChatId === chat.id
                      ? 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.8) 100%)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  {chat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-sm font-bold truncate"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: activeChatId === chat.id ? 'white' : '#333',
                    }}
                  >
                    {chat.name}
                  </div>
                  <div 
                    className="text-xs truncate"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: activeChatId === chat.id ? 'rgba(255,255,255,0.9)' : '#666',
                    }}
                  >
                    {chat.description}
                  </div>
                </div>
              </div>
              {chat.messages.length > 1 && (
                <div 
                  className="text-xs mt-2 truncate pl-13"
                  style={{ 
                    fontFamily: '"Lucida Grande", sans-serif',
                    color: activeChatId === chat.id ? 'rgba(255,255,255,0.8)' : '#888',
                  }}
                >
                  {chat.messages[chat.messages.length - 1].text.substring(0, 35)}...
                </div>
              )}
            </button>
          ))}
        </div>
        
        <div 
          className="p-3 text-center"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(240,240,255,0.5) 100%)',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
          }}
        >
          <div 
            className="text-xs"
            style={{ 
              fontFamily: '"Lucida Grande", sans-serif',
              color: '#666',
            }}
          >
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div 
          className="px-5 py-3 flex items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.9) 100%)',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.8) 100%)',
              boxShadow: '0 3px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              border: '1px solid rgba(255,255,255,0.6)',
            }}
          >
            {activeChat.icon}
          </div>
          <div>
            <h2 
              className="font-bold text-base"
              style={{ 
                fontFamily: '"Lucida Grande", sans-serif',
                color: '#333',
              }}
            >
              {activeChat.name}
            </h2>
            <p 
              className="text-xs"
              style={{ 
                fontFamily: '"Lucida Grande", sans-serif',
                color: '#666',
              }}
            >
              {activeChat.description}
            </p>
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-6 space-y-3"
          style={{
            background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
          }}
        >
          {activeChat.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[70%] px-4 py-2.5 rounded-2xl"
                style={{
                  fontFamily: '"Lucida Grande", sans-serif',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  ...(message.sender === 'me' 
                    ? {
                        background: 'linear-gradient(135deg, #5195E5 0%, #3A7FD5 100%)',
                        color: 'white',
                        boxShadow: '0 3px 8px rgba(81,149,229,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                        border: '1px solid rgba(255,255,255,0.2)',
                      }
                    : {
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                        color: '#333',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                        border: '1px solid rgba(255,255,255,0.6)',
                      }
                  ),
                }}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p 
                  className="text-[10px] mt-1"
                  style={{ 
                    opacity: 0.7,
                    color: message.sender === 'me' ? 'rgba(255,255,255,0.9)' : '#666',
                  }}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div 
                className="px-4 py-3 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,245,255,0.95) 100%)',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.6)',
                }}
              >
                <div className="flex gap-1.5">
                  <span 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#5195E5' }}
                  />
                  <span 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#5195E5', animationDelay: '0.1s' }}
                  />
                  <span 
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: '#5195E5', animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div 
          className="p-4"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,255,0.9) 100%)',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeChatId === 'me' ? 'Write to yourself...' : 'Ask Emese anything...'}
              className="flex-1 px-4 py-2 rounded-full focus:outline-none"
              style={{
                fontFamily: '"Lucida Grande", sans-serif',
                fontSize: '13px',
                background: 'white',
                border: '1px solid rgba(0,0,0,0.2)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 rounded-full font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: '"Lucida Grande", sans-serif',
                background: isLoading || !input.trim() 
                  ? 'linear-gradient(180deg, #ccc 0%, #aaa 100%)' 
                  : 'linear-gradient(180deg, #5195E5 0%, #3A7FD5 100%)',
                color: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
