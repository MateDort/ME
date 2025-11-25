'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export default function CalendarApp() {
  const [currentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<number | null>(null)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = currentDate.getDate()
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i)
  
  return (
    <div className="h-full bg-[#f5f0e6] flex flex-col">
      {/* Header */}
      <div className="bg-[#2a2a2a] text-white px-4 py-2 border-b-4 border-[#4a4a4a] shadow-[inset_0_-2px_0_#1a1a1a]">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span>📅</span>
          <span className="font-bold">Calendar v1.0</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] max-w-lg mx-auto">
          {/* Calendar Header */}
          <div className="bg-[#333] text-white px-4 py-3 font-mono text-center border-b-2 border-black">
            <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
          </div>
          
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-[#e8e8e8] border-b border-[#888]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center font-mono text-xs font-bold text-[#333] border-r border-[#ccc] last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="p-3 border-r border-b border-[#ddd] bg-[#f5f5f5]" />
            ))}
            {days.map((day) => (
              <motion.button
                key={day}
                onClick={() => setSelectedDate(day)}
                className={`p-3 border-r border-b border-[#ddd] font-mono text-sm transition-colors
                  ${day === today ? 'bg-black text-white font-bold' : 'hover:bg-[#e8e8e8]'}
                  ${selectedDate === day && day !== today ? 'bg-[#888] text-white' : ''}
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {day}
              </motion.button>
            ))}
          </div>
          
          {/* Footer */}
          <div className="bg-[#e8e8e8] border-t-2 border-[#888] p-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-[#666]">
                Today: {monthNames[month]} {today}, {year}
              </div>
              <div className="bg-[#ffffcc] border border-[#cc9] px-3 py-1">
                <span className="font-mono text-xs text-[#663]">
                  🔗 Google Calendar: Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Events placeholder */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_#000] max-w-lg mx-auto mt-4 p-4">
          <h3 className="font-mono font-bold text-sm border-b border-[#888] pb-2 mb-3">
            📋 Events
          </h3>
          <div className="font-mono text-sm text-[#666]">
            {selectedDate ? (
              <p>No events on {monthNames[month]} {selectedDate}</p>
            ) : (
              <p>Select a date to view events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
