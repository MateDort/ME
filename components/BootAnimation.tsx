'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function BootAnimation() {
  const [stage, setStage] = useState(0)
  const [text, setText] = useState('')

  const bootSequence = [
    'MEOS v1.0.0',
    'Initializing system...',
    'Loading memory modules...',
    'Starting AI agents...',
    'Connecting to neural network...',
    'Welcome to MEOS',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => {
        if (prev < bootSequence.length - 1) {
          setText(bootSequence[prev + 1])
          return prev + 1
        }
        return prev
      })
    }, 800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="scanline" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-green-400 font-retro text-2xl"
      >
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-4"
        >
          <span className="text-green-500">{'>'}</span>
          <span className="typing-animation">{text || bootSequence[0]}</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-green-500"
          >
            _
          </motion.span>
        </motion.div>
      </motion.div>
      <style jsx>{`
        .typing-animation {
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  )
}

