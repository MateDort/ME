'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

type ViewMode = 'icon' | 'list'

interface FileItem {
  name: string
  type: 'file' | 'folder'
  size?: string
  modified?: string
  icon: string
}

interface Folder {
  name: string
  icon: string
  path: string
}

const sidebarFolders: Folder[] = [
  { name: 'Home', icon: '🏠', path: '/home' },
  { name: 'Documents', icon: '📄', path: '/home/documents' },
  { name: 'Downloads', icon: '⬇️', path: '/home/downloads' },
  { name: 'Applications', icon: '📦', path: '/applications' },
  { name: 'Desktop', icon: '🖥️', path: '/home/desktop' },
  { name: 'Music', icon: '🎵', path: '/home/music' },
  { name: 'Pictures', icon: '🖼️', path: '/home/pictures' },
]

// Mock file system data
const mockFileSystem: Record<string, FileItem[]> = {
  '/home': [
    { name: 'Documents', type: 'folder', icon: '📄', modified: 'Today, 3:30 PM' },
    { name: 'Downloads', type: 'folder', icon: '⬇️', modified: 'Today, 2:15 PM' },
    { name: 'Desktop', type: 'folder', icon: '🖥️', modified: 'Yesterday' },
    { name: 'Music', type: 'folder', icon: '🎵', modified: 'Nov 20, 2025' },
    { name: 'Pictures', type: 'folder', icon: '🖼️', modified: 'Nov 18, 2025' },
  ],
  '/home/documents': [
    { name: 'Project Plan.txt', type: 'file', icon: '📝', size: '24 KB', modified: 'Today, 3:30 PM' },
    { name: 'Notes', type: 'folder', icon: '📁', modified: 'Today, 1:00 PM' },
    { name: 'Resume.pdf', type: 'file', icon: '📄', size: '156 KB', modified: 'Nov 22, 2025' },
  ],
  '/home/downloads': [
    { name: 'image.png', type: 'file', icon: '🖼️', size: '2.4 MB', modified: 'Today, 2:15 PM' },
    { name: 'archive.zip', type: 'file', icon: '🗜️', size: '15.8 MB', modified: 'Yesterday' },
  ],
  '/applications': [
    { name: 'MEOS', type: 'folder', icon: '💻', modified: 'Nov 25, 2025' },
    { name: 'Cursor', type: 'folder', icon: '🖥️', modified: 'Nov 25, 2025' },
    { name: 'Messages', type: 'folder', icon: '💬', modified: 'Nov 25, 2025' },
    { name: 'Safari', type: 'folder', icon: '🔍', modified: 'Nov 25, 2025' },
  ],
  '/home/desktop': [
    { name: 'Untitled.txt', type: 'file', icon: '📝', size: '0 KB', modified: 'Yesterday' },
  ],
  '/home/music': [
    { name: 'Playlists', type: 'folder', icon: '🎵', modified: 'Nov 20, 2025' },
  ],
  '/home/pictures': [
    { name: 'Vacation 2025', type: 'folder', icon: '📸', modified: 'Nov 18, 2025' },
  ],
}

export default function FinderApp() {
  const [currentPath, setCurrentPath] = useState('/home')
  const [viewMode, setViewMode] = useState<ViewMode>('icon')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [items, setItems] = useState<FileItem[]>([])

  useEffect(() => {
    // Load items for current path
    setItems(mockFileSystem[currentPath] || [])
    setSelectedItem(null)
  }, [currentPath])

  const handleFolderClick = (folder: Folder) => {
    setCurrentPath(folder.path)
  }

  const handleItemDoubleClick = (item: FileItem) => {
    if (item.type === 'folder') {
      setCurrentPath(`${currentPath}/${item.name.toLowerCase()}`)
    }
  }

  const handleBack = () => {
    if (currentPath === '/home') return
    const parts = currentPath.split('/')
    parts.pop()
    setCurrentPath(parts.join('/') || '/')
  }

  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean)
    return parts
  }

  return (
    <div 
      className="flex h-full"
      style={{
        background: 'linear-gradient(180deg, #E8E8E8 0%, #D0D0D0 100%)',
        fontFamily: '"Lucida Grande", sans-serif',
      }}
    >
      {/* Sidebar */}
      <div 
        className="w-48 border-r flex flex-col"
        style={{
          background: 'linear-gradient(90deg, #D8DEE8 0%, #C8CED8 100%)',
          borderColor: '#9CA6B0',
        }}
      >
        {/* Sidebar header */}
        <div 
          className="px-3 py-2 border-b text-xs font-bold"
          style={{
            color: '#4A5866',
            borderColor: '#9CA6B0',
            background: 'linear-gradient(180deg, #E0E6F0 0%, #D0D6E0 100%)',
          }}
        >
          PLACES
        </div>

        {/* Sidebar items */}
        <div className="flex-1 overflow-y-auto py-2">
          {sidebarFolders.map((folder) => (
            <motion.button
              key={folder.path}
              onClick={() => handleFolderClick(folder)}
              className="w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm"
              style={{
                color: currentPath === folder.path ? '#000' : '#4A5866',
                background: currentPath === folder.path 
                  ? 'linear-gradient(90deg, #5195E5 0%, #4080D0 100%)'
                  : 'transparent',
              }}
              whileHover={{
                background: currentPath === folder.path 
                  ? 'linear-gradient(90deg, #5195E5 0%, #4080D0 100%)'
                  : 'rgba(81, 149, 229, 0.2)',
              }}
            >
              <span>{folder.icon}</span>
              <span 
                style={{
                  color: currentPath === folder.path ? '#FFF' : '#1A1A1A',
                  textShadow: currentPath === folder.path ? '0 1px 0 rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {folder.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div 
          className="border-b px-3 py-2 flex items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #F0F0F0 0%, #D8D8D8 100%)',
            borderColor: '#9CA6B0',
          }}
        >
          {/* Back/Forward buttons */}
          <div className="flex gap-1">
            <motion.button
              onClick={handleBack}
              disabled={currentPath === '/home'}
              className="px-3 py-1 rounded text-sm font-medium"
              style={{
                background: currentPath === '/home' 
                  ? 'rgba(0,0,0,0.1)'
                  : 'linear-gradient(180deg, #FFF 0%, #E0E0E0 100%)',
                border: '1px solid #999',
                color: currentPath === '/home' ? '#999' : '#333',
                boxShadow: currentPath === '/home' ? 'none' : '0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
              whileHover={currentPath !== '/home' ? { scale: 1.05 } : {}}
              whileTap={currentPath !== '/home' ? { scale: 0.95 } : {}}
            >
              ◀
            </motion.button>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-1">
            <span style={{ color: '#4A5866' }}>🏠</span>
            {getBreadcrumbs().map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                <span style={{ color: '#999' }}>›</span>
                <span style={{ color: '#1A1A1A' }} className="font-medium">
                  {part.charAt(0).toUpperCase() + part.slice(1)}
                </span>
              </span>
            ))}
          </div>

          {/* View mode toggle */}
          <div 
            className="flex gap-1 p-1 rounded"
            style={{
              background: 'rgba(0,0,0,0.1)',
              border: '1px solid rgba(0,0,0,0.2)',
            }}
          >
            <motion.button
              onClick={() => setViewMode('icon')}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: viewMode === 'icon' 
                  ? 'linear-gradient(180deg, #FFF 0%, #E0E0E0 100%)'
                  : 'transparent',
                color: '#333',
                boxShadow: viewMode === 'icon' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ⊞
            </motion.button>
            <motion.button
              onClick={() => setViewMode('list')}
              className="px-2 py-1 rounded text-xs"
              style={{
                background: viewMode === 'list' 
                  ? 'linear-gradient(180deg, #FFF 0%, #E0E0E0 100%)'
                  : 'transparent',
                color: '#333',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              ☰
            </motion.button>
          </div>
        </div>

        {/* Content area */}
        <div 
          className="flex-1 overflow-auto p-4"
          style={{
            background: '#FFF',
          }}
        >
          {items.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center h-full"
              style={{ color: '#999' }}
            >
              <span className="text-6xl mb-4">📂</span>
              <p className="text-sm">This folder is empty</p>
            </div>
          ) : viewMode === 'icon' ? (
            // Icon view
            <div className="grid grid-cols-4 gap-6">
              {items.map((item) => (
                <motion.div
                  key={item.name}
                  onClick={() => setSelectedItem(item.name)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className="flex flex-col items-center cursor-pointer p-2 rounded"
                  style={{
                    background: selectedItem === item.name 
                      ? 'linear-gradient(135deg, rgba(81, 149, 229, 0.3) 0%, rgba(64, 128, 208, 0.3) 100%)'
                      : 'transparent',
                  }}
                  whileHover={{
                    background: selectedItem === item.name
                      ? 'linear-gradient(135deg, rgba(81, 149, 229, 0.3) 0%, rgba(64, 128, 208, 0.3) 100%)'
                      : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <span className="text-5xl mb-2">{item.icon}</span>
                  <p 
                    className="text-xs text-center break-words max-w-full"
                    style={{ color: '#1A1A1A' }}
                  >
                    {item.name}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            // List view
            <div>
              {/* List header */}
              <div 
                className="grid grid-cols-12 gap-4 px-3 py-2 border-b text-xs font-bold"
                style={{
                  color: '#4A5866',
                  borderColor: '#DDD',
                  background: 'linear-gradient(180deg, #F8F8F8 0%, #ECECEC 100%)',
                }}
              >
                <div className="col-span-6">Name</div>
                <div className="col-span-3">Modified</div>
                <div className="col-span-3">Size</div>
              </div>

              {/* List items */}
              {items.map((item) => (
                <motion.div
                  key={item.name}
                  onClick={() => setSelectedItem(item.name)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  className="grid grid-cols-12 gap-4 px-3 py-2 border-b cursor-pointer"
                  style={{
                    borderColor: '#F0F0F0',
                    background: selectedItem === item.name 
                      ? 'linear-gradient(90deg, rgba(81, 149, 229, 0.3) 0%, rgba(64, 128, 208, 0.3) 100%)'
                      : 'transparent',
                  }}
                  whileHover={{
                    background: selectedItem === item.name
                      ? 'linear-gradient(90deg, rgba(81, 149, 229, 0.3) 0%, rgba(64, 128, 208, 0.3) 100%)'
                      : 'rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="col-span-6 flex items-center gap-2 text-sm">
                    <span>{item.icon}</span>
                    <span style={{ color: '#1A1A1A' }}>{item.name}</span>
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: '#666' }}>
                    {item.modified}
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: '#666' }}>
                    {item.type === 'folder' ? '--' : item.size}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div 
          className="border-t px-3 py-1 flex items-center justify-between text-xs"
          style={{
            background: 'linear-gradient(180deg, #E8E8E8 0%, #D0D0D0 100%)',
            borderColor: '#9CA6B0',
            color: '#4A5866',
          }}
        >
          <span>{items.length} items</span>
          {selectedItem && (
            <span>1 item selected</span>
          )}
        </div>
      </div>
    </div>
  )
}

