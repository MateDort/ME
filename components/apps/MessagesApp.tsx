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
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS)
  const [activeChatId, setActiveChatId] = useState('emese')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { addWindow, windows } = useOSStore()

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages])

  // Load chats from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('meos_messages_chats')
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats)
        // Restore Date objects
        parsed.forEach((chat: Chat) => {
          chat.messages.forEach((msg: Message) => {
            msg.timestamp = new Date(msg.timestamp)
          })
        })
        setChats(parsed)
      } catch (e) {
        console.error('Failed to load chats:', e)
      }
    }
  }, [])

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem('meos_messages_chats', JSON.stringify(chats))
  }, [chats])

  const handleOpenApp = (appName: string) => {
    const appMap: Record<string, { title: string; component: string; icon: string }> = {
      'brainstorm': { title: 'Brainstorm', component: 'brainstorm', icon: '💡' },
      'calendar': { title: 'Calendar', component: 'calendar', icon: '📅' },
      'maps': { title: 'Maps', component: 'maps', icon: '🗺️' },
      'music': { title: 'Music', component: 'music', icon: '🎵' },
      'news': { title: 'News', component: 'news', icon: '📰' },
      'health': { title: 'Health', component: 'health', icon: '🏃' },
      'search': { title: 'Google', component: 'search', icon: '🔍' },
      'skillshipping': { title: 'SkillShipping', component: 'skillshipping', icon: '📦' },
      'neuranote': { title: 'NeuraNote', component: 'neuranote', icon: '🧠' },
      'doorman': { title: 'AI Doorman', component: 'doorman', icon: '🚪' },
      'piano': { title: 'Piano', component: 'piano', icon: '🎹' },
      'language': { title: 'Language', component: 'language', icon: '🌍' },
    }

    const app = appMap[appName.toLowerCase()]
    if (app) {
      const existingWindow = windows.find((w) => w.component === app.component)
      if (!existingWindow) {
        addWindow({
          id: `${app.component}-${Date.now()}`,
          title: app.title,
          component: app.component,
          x: 100 + Math.random() * 200,
          y: 40 + Math.random() * 200,
          width: 800,
          height: 600,
          minimized: false,
          maximized: false,
        })
      }
      return true
    }
    return false
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'me',
      timestamp: new Date(),
    }

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, userMessage] }
          : chat
      )
    )
    const userInput = input
    setInput('')
    setIsLoading(true)

    try {
      let response: string = "Let me think about that..."

      if (activeChatId === 'me') {
        // Self-reflection mode - just acknowledge
        response = "I've noted that down. Keep reflecting! 📝"
      } else {
        // Emese AI assistant
        // Check for app commands
        const appKeywords = ['open', 'launch', 'start', 'show']
        const lowerInput = userInput.toLowerCase()
        let openedApp = false

        for (const keyword of appKeywords) {
          if (lowerInput.includes(keyword)) {
            const apps = ['brainstorm', 'calendar', 'maps', 'music', 'news', 'health', 'search', 'skillshipping', 'neuranote', 'doorman', 'piano', 'language']
            for (const app of apps) {
              if (lowerInput.includes(app)) {
                openedApp = handleOpenApp(app)
                if (openedApp) {
                  response = `Opening ${app.charAt(0).toUpperCase() + app.slice(1)} for you! ✨`
                  break
                }
              }
            }
            if (openedApp) break
          }
        }

        if (!openedApp) {
          // Call Emese API
          const res = await fetch('/api/emese', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userInput }),
          })
          const data = await res.json()
          response = data.response || "Let me think about that..."
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
      }

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, assistantMessage] }
            : chat
        )
      )
    } catch (error) {
      console.error('Error getting response:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I couldn't process that. Please try again.",
        sender: 'assistant',
        timestamp: new Date(),
      }
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex">
      {/* Sidebar - Chat List - Aqua Style */}
      <div 
        className="w-60 flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #e8e8f0 0%, #d8d8e8 100%)',
          borderRight: '1px solid rgba(0,0,0,0.2)',
        }}
      >
        {/* Sidebar Header */}
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
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto py-2">
          {chats.map((chat) => (
            <motion.button
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
              whileHover={{ 
                x: 2,
                background: activeChatId !== chat.id ? 'rgba(81,149,229,0.1)' : undefined
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
            </motion.button>
          ))}
        </div>
        
        {/* Sidebar Footer */}
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
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header - Aqua Style */}
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

        {/* Messages - iChat style bubbles */}
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
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl`}
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
                  {message.timestamp.toLocaleTimeString()}
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

        {/* Input - Aqua Style */}
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
