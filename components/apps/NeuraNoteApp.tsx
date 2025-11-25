'use client'

import { motion } from 'framer-motion'

export default function NeuraNoteApp() {
  return (
    <div className="h-full bg-[#f5f0e6] flex flex-col">
      {/* Header */}
      <div className="bg-[#2a2a2a] text-white px-4 py-2 border-b-4 border-[#4a4a4a] shadow-[inset_0_-2px_0_#1a1a1a]">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>🧠</span>
          <span className="font-bold">NeuraNote v1.0</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Classic Mac-style window */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] p-8 max-w-md">
            <div className="text-6xl mb-6">🧠</div>
            <h1 className="text-2xl font-bold font-mono mb-4 tracking-tight">
              NeuraNote
            </h1>
            <div className="bg-[#e8e8e8] border border-[#888] p-4 mb-4">
              <p className="font-mono text-sm text-[#333]">
                AI-powered note taking.
              </p>
              <p className="font-mono text-sm text-[#333] mt-2">
                Notes that think with you. Auto-organize, summarize, and connect your thoughts.
              </p>
            </div>
            <div className="bg-[#ffffcc] border border-[#cc9] p-3">
              <p className="font-mono text-xs text-[#663]">
                ⚠️ Coming Soon
              </p>
              <p className="font-mono text-xs text-[#663] mt-1">
                Neural networks are being trained.
              </p>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="mt-6 flex justify-center gap-4">
            <div className="w-3 h-3 bg-black" />
            <div className="w-3 h-3 bg-[#888]" />
            <div className="w-3 h-3 bg-black" />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
