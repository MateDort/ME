'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function MapsApp() {
  const [searchQuery, setSearchQuery] = useState('')
  
  return (
    <div className="h-full bg-[#f5f0e6] flex flex-col">
      {/* Header */}
      <div className="bg-[#2a2a2a] text-white px-4 py-2 border-b-4 border-[#4a4a4a] shadow-[inset_0_-2px_0_#1a1a1a]">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>🗺️</span>
          <span className="font-bold">Maps v1.0</span>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="bg-[#e8e8e8] border-b-2 border-[#888] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations..."
            className="flex-1 px-3 py-2 bg-white border-2 border-black font-mono text-sm shadow-[2px_2px_0_#000] focus:outline-none"
          />
          <button className="px-4 py-2 bg-black text-white font-mono text-sm font-bold shadow-[2px_2px_0_#666] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#666] transition-all">
            Search
          </button>
        </div>
      </div>
      
      {/* Map Area */}
      <div className="flex-1 relative bg-[#d4e6c3]">
        {/* Fake map grid */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#666" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Decorative roads */}
          <div className="absolute top-1/4 left-0 right-0 h-2 bg-[#888]" />
          <div className="absolute top-1/2 left-0 right-0 h-3 bg-[#666]" />
          <div className="absolute top-3/4 left-0 right-0 h-2 bg-[#888]" />
          <div className="absolute left-1/4 top-0 bottom-0 w-2 bg-[#888]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-3 bg-[#666]" />
          <div className="absolute left-3/4 top-0 bottom-0 w-2 bg-[#888]" />
          
          {/* Location markers */}
          <motion.div 
            className="absolute top-1/3 left-1/3 text-2xl cursor-pointer"
            whileHover={{ scale: 1.2 }}
            title="Coffee Shop"
          >
            ☕
          </motion.div>
          <motion.div 
            className="absolute top-1/2 left-1/2 text-3xl cursor-pointer"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            title="You are here"
          >
            📍
          </motion.div>
          <motion.div 
            className="absolute top-2/3 left-2/3 text-2xl cursor-pointer"
            whileHover={{ scale: 1.2 }}
            title="Park"
          >
            🌳
          </motion.div>
          <motion.div 
            className="absolute top-1/4 left-3/4 text-2xl cursor-pointer"
            whileHover={{ scale: 1.2 }}
            title="Restaurant"
          >
            🍕
          </motion.div>
        </div>
        
        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] p-6 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <h2 className="font-mono font-bold mb-2">Maps</h2>
            <div className="bg-[#ffffcc] border border-[#cc9] p-3">
              <p className="font-mono text-xs text-[#663]">
                🔗 Google Maps Integration
              </p>
              <p className="font-mono text-xs text-[#663] mt-1">
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-[#e8e8e8] border-t-2 border-[#888] p-2">
        <div className="flex justify-between items-center font-mono text-xs text-[#666]">
          <span>Lat: 47.4979° N</span>
          <span>•</span>
          <span>Long: 19.0402° E</span>
          <span>•</span>
          <span>Zoom: 12x</span>
        </div>
      </div>
    </div>
  )
}
