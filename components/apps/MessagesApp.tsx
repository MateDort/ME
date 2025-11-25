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
    <div className="h-full flex bg-[#f5f0e6]">
      {/* Sidebar - Chat List */}
      <div className="w-56 bg-[#e8e8e8] border-r-2 border-black flex flex-col">
        {/* Sidebar Header */}
        <div className="bg-[#2a2a2a] text-white px-3 py-2 border-b-2 border-black">
          <h2 className="font-mono text-sm font-bold">💬 Messages</h2>
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <motion.button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={`w-full text-left px-3 py-3 border-b border-[#ccc] transition-colors ${
                activeChatId === chat.id
                  ? 'bg-white border-l-4 border-l-black'
                  : 'hover:bg-[#f0f0f0]'
              }`}
              whileHover={{ x: 2 }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{chat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm font-bold truncate">{chat.name}</div>
                  <div className="font-mono text-xs text-[#666] truncate">{chat.description}</div>
                </div>
              </div>
              {chat.messages.length > 1 && (
                <div className="font-mono text-xs text-[#888] mt-1 truncate">
                  {chat.messages[chat.messages.length - 1].text.substring(0, 30)}...
                </div>
              )}
            </motion.button>
          ))}
        </div>
        
        {/* Sidebar Footer */}
        <div className="p-2 bg-[#d0d0d0] border-t-2 border-[#888]">
          <div className="font-mono text-xs text-[#666] text-center">
            {chats.length} conversations
          </div>
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-[#2a2a2a] text-white px-4 py-2 border-b-2 border-black flex items-center gap-3">
          <span className="text-2xl">{activeChat.icon}</span>
          <div>
            <h2 className="font-mono font-bold">{activeChat.name}</h2>
            <p className="font-mono text-xs text-[#aaa]">{activeChat.description}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f5f0e6]">
          {activeChat.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 font-mono text-sm ${
                  message.sender === 'me'
                    ? 'bg-black text-white shadow-[2px_2px_0_#666]'
                    : 'bg-white text-black border-2 border-black shadow-[2px_2px_0_#000]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className="text-xs mt-2 opacity-60">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-black border-2 border-black shadow-[2px_2px_0_#000] p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-black animate-bounce" />
                  <span className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-black animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t-2 border-black bg-[#e8e8e8] p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeChatId === 'me' ? 'Write to yourself...' : 'Ask Emese anything...'}
              className="flex-1 px-4 py-2 bg-white border-2 border-black font-mono text-sm shadow-[2px_2px_0_#000] focus:outline-none placeholder-[#888]"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="px-6 py-2 bg-black text-white font-mono text-sm font-bold shadow-[2px_2px_0_#666] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#666] transition-all disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
