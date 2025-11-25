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
      className="absolute overflow-hidden rounded-xl"
      style={{
        left: window.x,
        top: window.maximized ? '24px' : `${window.y}px`,
        width: window.maximized ? '100%' : window.width,
        height: window.maximized ? 'calc(100% - 24px)' : window.height,
        zIndex: window.zIndex,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 1px rgba(0,0,0,0.1)',
        background: 'rgba(236, 236, 236, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(0,0,0,0.1)',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseDown={handleMouseDown}
      onClick={() => setActiveWindow(window.id)}
    >
      {/* macOS Style Title Bar */}
      <div 
        className="h-7 flex items-center px-3 cursor-move"
        style={{
          background: 'linear-gradient(180deg, #e8e8e8 0%, #d0d0d0 100%)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        }}
        onDoubleClick={handleTitleBarDoubleClick}
      >
        {/* Traffic lights */}
        <div className="flex gap-2 mr-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(window.id)
            }}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center group"
            style={{ boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.1)' }}
          >
            <span className="text-[8px] text-[#4d0000] opacity-0 group-hover:opacity-100">✕</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { minimized: true })
            }}
            className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#ff9500] transition-colors flex items-center justify-center group"
            style={{ boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.1)' }}
          >
            <span className="text-[8px] text-[#995700] opacity-0 group-hover:opacity-100">−</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { maximized: !window.maximized })
            }}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#00c853] transition-colors flex items-center justify-center group"
            style={{ boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.1)' }}
          >
            <span className="text-[8px] text-[#006400] opacity-0 group-hover:opacity-100">⤢</span>
          </button>
        </div>
        
        {/* Title */}
        <span 
          className="flex-1 text-center text-[13px] font-medium text-gray-700 truncate"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}
        >
          {window.title}
        </span>
        <div className="w-16" />
      </div>

      {/* Content */}
      <div className="h-[calc(100%-28px)] overflow-auto bg-white">
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
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-20" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
        </>
      )}
    </motion.div>
  )
}
