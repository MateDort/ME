'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getChatResponse } from '@/lib/agents'

interface Message {
  id: string
  text: string
  sender: 'me' | 'mate'
  timestamp: Date
}

export default function MessagesApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey, what are you thinking about today?',
      sender: 'mate',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'me',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await getChatResponse(input)
      const mateMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'mate',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, mateMessage])
    } catch (error) {
      console.error('Error getting response:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-retro-beige to-retro-brown">
      {/* Header */}
      <div className="bg-retro-orange text-black px-4 py-3 border-b-2 border-black">
        <h2 className="font-bold text-lg">Messages - Máté</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'me'
                  ? 'bg-retro-blue text-white'
                  : 'bg-white text-black border-2 border-black'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-black border-2 border-black rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-black rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-black rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <span
                  className="w-2 h-2 bg-black rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-2 border-black bg-retro-yellow p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border-2 border-black rounded bg-white text-black placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-2 bg-retro-green text-black border-2 border-black rounded font-bold hover:bg-retro-purple disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

