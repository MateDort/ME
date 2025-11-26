'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (success: boolean) => void
}

const CORRECT_USERNAME = 'MateDort'
const CORRECT_PASSWORD = "HuN'03-'23UsA'23-"

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
      onLogin(true)
      setUsername('')
      setPassword('')
      setError('')
      onClose()
    } else {
      setError('Incorrect username or password')
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
      onLogin(false)
    }
  }

  const handleCancel = () => {
    setUsername('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
            onClick={handleCancel}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              x: isShaking ? [-10, 10, -10, 10, 0] : 0
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-xl z-[10000]"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,255,0.98) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.7)',
            }}
          >
            {/* Header */}
            <div 
              className="px-6 py-4 border-b"
              style={{
                borderColor: 'rgba(0,0,0,0.1)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, transparent 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #5195E5 0%, #3A7FD5 100%)',
                    boxShadow: '0 3px 8px rgba(81,149,229,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  🔐
                </div>
                <div>
                  <h2 
                    className="font-bold text-lg"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: '#333',
                    }}
                  >
                    Authentication Required
                  </h2>
                  <p 
                    className="text-xs"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: '#666',
                    }}
                  >
                    Enter your credentials to continue
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Username */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-1"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: '#333',
                    }}
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setError('')
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
                    style={{
                      fontFamily: '"Lucida Grande", sans-serif',
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.2)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    }}
                    placeholder="Enter username"
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div>
                  <label 
                    className="block text-sm font-semibold mb-1"
                    style={{ 
                      fontFamily: '"Lucida Grande", sans-serif',
                      color: '#333',
                    }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2"
                    style={{
                      fontFamily: '"Lucida Grande", sans-serif',
                      background: 'white',
                      border: '1px solid rgba(0,0,0,0.2)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    }}
                    placeholder="Enter password"
                  />
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3 py-2 rounded-lg text-sm"
                      style={{
                        background: 'rgba(255,0,0,0.1)',
                        border: '1px solid rgba(255,0,0,0.3)',
                        color: '#cc0000',
                        fontFamily: '"Lucida Grande", sans-serif',
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    fontFamily: '"Lucida Grande", sans-serif',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.9) 100%)',
                    border: '1px solid rgba(0,0,0,0.2)',
                    color: '#333',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(245,245,245,1) 100%)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.9) 100%)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{
                    fontFamily: '"Lucida Grande", sans-serif',
                    background: 'linear-gradient(135deg, #5195E5 0%, #3A7FD5 100%)',
                    border: '1px solid rgba(58,127,213,0.8)',
                    boxShadow: '0 2px 6px rgba(81,149,229,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #5FA5F5 0%, #4A8FE5 100%)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #5195E5 0%, #3A7FD5 100%)'
                  }}
                >
                  Log In
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

