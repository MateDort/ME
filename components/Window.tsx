'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOSStore, Window as WindowType } from '@/lib/store'

interface WindowProps {
  window: WindowType
  children: React.ReactNode
}

export default function Window({ window, children }: WindowProps) {
  const { setActiveWindow, updateWindow, closeWindow } = useOSStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ 
    mouseX: 0, 
    mouseY: 0, 
    windowX: 0,
    windowY: 0,
    width: 0, 
    height: 0 
  })

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - window.x,
      y: e.clientY - window.y,
    })
    setActiveWindow(window.id)
  }

  const handleTitleBarDoubleClick = () => {
    updateWindow(window.id, { maximized: !window.maximized })
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateWindow(window.id, {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        })
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.mouseX
        const deltaY = e.clientY - resizeStart.mouseY
        let newWidth = resizeStart.width
        let newHeight = resizeStart.height
        let newX = window.x
        let newY = window.y

        if (isResizing === 'top-left') {
          newWidth = Math.max(300, resizeStart.width - deltaX)
          newHeight = Math.max(200, resizeStart.height - deltaY)
          newX = resizeStart.windowX + deltaX
          newY = resizeStart.windowY + deltaY
        } else if (isResizing === 'top-right') {
          newWidth = Math.max(300, resizeStart.width + deltaX)
          newHeight = Math.max(200, resizeStart.height - deltaY)
          newY = resizeStart.windowY + deltaY
        } else if (isResizing === 'bottom-left') {
          newWidth = Math.max(300, resizeStart.width - deltaX)
          newHeight = Math.max(200, resizeStart.height + deltaY)
          newX = resizeStart.windowX + deltaX
        } else if (isResizing === 'bottom-right') {
          newWidth = Math.max(300, resizeStart.width + deltaX)
          newHeight = Math.max(200, resizeStart.height + deltaY)
        } else {
          if (isResizing.includes('right')) {
            newWidth = Math.max(300, resizeStart.width + deltaX)
          }
          if (isResizing.includes('left')) {
            newWidth = Math.max(300, resizeStart.width - deltaX)
            newX = resizeStart.windowX + deltaX
          }
          if (isResizing.includes('bottom')) {
            newHeight = Math.max(200, resizeStart.height + deltaY)
          }
          if (isResizing.includes('top')) {
            newHeight = Math.max(200, resizeStart.height - deltaY)
            newY = resizeStart.windowY + deltaY
          }
        }

        updateWindow(window.id, {
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset.x, dragOffset.y, resizeStart, window.id, window.x, window.y, updateWindow])

  const handleResizeStart = (e: React.MouseEvent, edge: string) => {
    e.stopPropagation()
    setIsResizing(edge)
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      windowX: window.x,
      windowY: window.y,
      width: window.width,
      height: window.height,
    })
    setActiveWindow(window.id)
  }

  if (window.minimized) return null

  return (
    <motion.div
      className="absolute bg-white border-2 border-black shadow-[4px_4px_0_#000] overflow-hidden"
      style={{
        left: window.x,
        top: window.maximized ? '28px' : `${window.y}px`,
        width: window.maximized ? '100%' : window.width,
        height: window.maximized ? 'calc(100% - 28px)' : window.height,
        zIndex: window.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseDown={handleMouseDown}
      onClick={() => setActiveWindow(window.id)}
    >
      {/* Classic Mac Title Bar with stripes */}
      <div 
        className="bg-white px-2 py-1 cursor-move border-b-2 border-black relative"
        onDoubleClick={handleTitleBarDoubleClick}
      >
        {/* Horizontal stripes pattern */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className="h-[2px] bg-black" 
              style={{ marginTop: i === 0 ? '3px' : '2px' }}
            />
          ))}
        </div>
        
        {/* Close box */}
        <div className="flex items-center relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(window.id)
            }}
            className="w-4 h-4 border-2 border-black bg-white hover:bg-black hover:text-white flex items-center justify-center text-xs font-bold mr-2"
          >
            ×
          </button>
          
          {/* Title with white background */}
          <div className="flex-1 flex justify-center">
            <span className="bg-white px-2 font-mono text-sm font-bold">{window.title}</span>
          </div>
          
          {/* Zoom box */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { maximized: !window.maximized })
            }}
            className="w-4 h-4 border-2 border-black bg-white hover:bg-black flex items-center justify-center"
          >
            <div className="w-2 h-2 border border-black" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-[calc(100%-28px)] overflow-auto bg-[#f5f0e6]">
        {children}
      </div>

      {/* Resize Handles */}
      {!window.maximized && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'top')} />
          <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
          <div className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'left')} />
          <div className="absolute top-0 bottom-0 right-0 w-1 cursor-ew-resize z-10" onMouseDown={(e) => handleResizeStart(e, 'right')} />
          <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
          <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
          <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
          {/* Classic Mac resize grip in bottom-right */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20" 
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          >
            <svg className="w-full h-full" viewBox="0 0 16 16">
              <line x1="4" y1="16" x2="16" y2="4" stroke="black" strokeWidth="1" />
              <line x1="8" y1="16" x2="16" y2="8" stroke="black" strokeWidth="1" />
              <line x1="12" y1="16" x2="16" y2="12" stroke="black" strokeWidth="1" />
            </svg>
          </div>
        </>
      )}
    </motion.div>
  )
}
