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

  const handlePointerDown = (e: React.PointerEvent) => {
    setActiveWindow(window.id)

    if ((e.target as HTMLElement).closest('button, input, textarea, select, a')) return

    if (e.pointerType === 'mouse' && e.button !== 0) return

    if (e.pointerType === 'touch') {
      const isTitleBar = (e.target as HTMLElement).closest('[data-window-title-bar="true"]')
      if (!isTitleBar) return
      e.preventDefault()
    }

    setIsDragging(true)
    setDragOffset({
      x: e.clientX - window.x,
      y: e.clientY - window.y,
    })
  }

  const handleTitleBarDoubleClick = () => {
    updateWindow(window.id, { maximized: !window.maximized })
  }

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handlePointerMove = (e: PointerEvent) => {
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

    const handlePointerUp = () => {
      setIsDragging(false)
      setIsResizing(null)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [isDragging, isResizing, dragOffset.x, dragOffset.y, resizeStart, window.id, window.x, window.y, updateWindow])

  const handleResizeStart = (e: React.PointerEvent, edge: string) => {
    e.stopPropagation()
    if (e.pointerType === 'touch') {
      e.preventDefault()
    }
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
      className="absolute overflow-hidden rounded-lg"
      style={{
        left: window.x,
        top: window.maximized ? '24px' : `${window.y}px`,
        width: window.maximized ? '100%' : window.width,
        height: window.maximized ? 'calc(100% - 24px)' : window.height,
        zIndex: window.zIndex,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3)',
        background: 'rgba(236, 236, 236, 0.98)',
        border: '1px solid rgba(255,255,255,0.5)',
      }}
      initial={{ opacity: 0, scale: 0.95, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onPointerDown={handlePointerDown}
      onClick={() => setActiveWindow(window.id)}
    >
      {/* Classic Aqua Title Bar with brushed metal */}
      <div 
        className="h-7 flex items-center px-3 cursor-move relative"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(255,255,255,0.8) 0%, 
              rgba(220,220,230,0.8) 20%,
              rgba(200,200,220,0.8) 50%, 
              rgba(180,180,210,0.8) 80%,
              rgba(160,160,200,0.8) 100%
            )
          `,
          borderBottom: '1px solid rgba(0,0,0,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          touchAction: 'none',
        }}
        onDoubleClick={handleTitleBarDoubleClick}
        data-window-title-bar="true"
      >
        {/* Classic Aqua traffic lights */}
        <div className="flex gap-2 mr-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeWindow(window.id)
            }}
            className="w-3 h-3 rounded-full flex items-center justify-center group relative"
            style={{ 
              background: 'linear-gradient(135deg, #ff5f52 0%, #ff3b30 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '0.5px solid rgba(0,0,0,0.2)',
            }}
          >
            <span 
              className="text-[7px] text-[#8b0000] opacity-0 group-hover:opacity-100 font-bold"
              style={{ textShadow: '0 0.5px 0 rgba(255,255,255,0.3)' }}
            >
              ✕
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { minimized: true })
            }}
            className="w-3 h-3 rounded-full flex items-center justify-center group"
            style={{ 
              background: 'linear-gradient(135deg, #ffbd2e 0%, #ff9500 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '0.5px solid rgba(0,0,0,0.2)',
            }}
          >
            <span 
              className="text-[7px] text-[#995700] opacity-0 group-hover:opacity-100 font-bold"
              style={{ textShadow: '0 0.5px 0 rgba(255,255,255,0.3)' }}
            >
              −
            </span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateWindow(window.id, { maximized: !window.maximized })
            }}
            className="w-3 h-3 rounded-full flex items-center justify-center group"
            style={{ 
              background: 'linear-gradient(135deg, #28cd41 0%, #1aab29 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '0.5px solid rgba(0,0,0,0.2)',
            }}
          >
            <span 
              className="text-[7px] text-[#006400] opacity-0 group-hover:opacity-100 font-bold"
              style={{ textShadow: '0 0.5px 0 rgba(255,255,255,0.3)' }}
            >
              +
            </span>
          </button>
        </div>
        
        {/* Title */}
        <span 
          className="flex-1 text-center text-[13px] font-bold truncate"
          style={{ 
            color: '#333',
            fontFamily: '"Lucida Grande", sans-serif',
            textShadow: '0 1px 0 rgba(255,255,255,0.8)',
          }}
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
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'top')}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'bottom')}
          />
          <div
            className="absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'left')}
          />
          <div
            className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize z-10"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'right')}
          />
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-20"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-20"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-20"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-20"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
        </>
      )}
    </motion.div>
  )
}
