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

        // Handle corners (resize both dimensions)
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
          // Handle edges (single dimension)
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
      className="absolute bg-white/90 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 overflow-hidden"
      style={{
        left: window.x,
        top: window.maximized ? '32px' : `${window.y}px`,
        width: window.maximized ? '100%' : window.width,
        height: window.maximized ? 'calc(100% - 32px)' : window.height,
        zIndex: window.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseDown={handleMouseDown}
      onClick={() => setActiveWindow(window.id)}
    >
      {/* Title Bar */}
      <div className="bg-gray-100/80 backdrop-blur-sm px-4 py-2 flex items-center cursor-move border-b border-gray-200">
        <div className="flex gap-2 mr-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(window.id)
            }}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { minimized: true })
            }}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { maximized: !window.maximized })
            }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
          />
        </div>
        <span className="flex-1 text-center text-sm font-medium text-gray-700">{window.title}</span>
        <div className="w-16" /> {/* Spacer for balance */}
      </div>

      {/* Content */}
      <div className="h-[calc(100%-40px)] overflow-auto bg-white">
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

