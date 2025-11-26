import { NextRequest, NextResponse } from 'next/server'

// Security: Only allow access to these virtual directories
const ALLOWED_PATHS = [
  '/home',
  '/home/documents',
  '/home/downloads',
  '/home/desktop',
  '/home/music',
  '/home/pictures',
  '/applications',
]

interface FileItem {
  name: string
  type: 'file' | 'folder'
  size?: string
  modified?: string
  icon: string
}

// Mock file system - In a real app, this would interact with actual filesystem
// or a database. For security, this is intentionally read-only and sandboxed.
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
    { name: 'Brainstorm', type: 'folder', icon: '💡', modified: 'Nov 25, 2025' },
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

function isPathAllowed(path: string): boolean {
  // Check if path starts with any allowed path
  return ALLOWED_PATHS.some(allowedPath => 
    path === allowedPath || path.startsWith(allowedPath + '/')
  )
}

function normalizePath(path: string): string {
  // Remove trailing slashes and normalize
  return path.replace(/\/+$/, '') || '/'
}

// GET - Read directory contents
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || '/home'
    const normalizedPath = normalizePath(path)

    // Security check
    if (!isPathAllowed(normalizedPath)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You do not have permission to access this directory.' },
        { status: 403 }
      )
    }

    // Get directory contents
    const items = mockFileSystem[normalizedPath] || []

    return NextResponse.json({
      path: normalizedPath,
      items,
      success: true,
    })
  } catch (error: any) {
    console.error('Filesystem GET error:', error)
    return NextResponse.json(
      { error: 'Failed to read directory', message: error.message },
      { status: 500 }
    )
  }
}

// POST - Create file or folder
export async function POST(req: NextRequest) {
  try {
    const { path, name, type } = await req.json()
    const normalizedPath = normalizePath(path)

    // Security check
    if (!isPathAllowed(normalizedPath)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You do not have permission to create items here.' },
        { status: 403 }
      )
    }

    // In a real app, this would create the actual file/folder
    // For now, we just simulate success
    console.log(`Creating ${type} "${name}" at ${normalizedPath}`)

    return NextResponse.json({
      success: true,
      message: `${type === 'folder' ? 'Folder' : 'File'} created successfully`,
    })
  } catch (error: any) {
    console.error('Filesystem POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create item', message: error.message },
      { status: 500 }
    )
  }
}

// PUT - Rename file or folder
export async function PUT(req: NextRequest) {
  try {
    const { path, oldName, newName } = await req.json()
    const normalizedPath = normalizePath(path)

    // Security check
    if (!isPathAllowed(normalizedPath)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You do not have permission to rename items here.' },
        { status: 403 }
      )
    }

    // In a real app, this would rename the actual file/folder
    console.log(`Renaming "${oldName}" to "${newName}" at ${normalizedPath}`)

    return NextResponse.json({
      success: true,
      message: 'Item renamed successfully',
    })
  } catch (error: any) {
    console.error('Filesystem PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to rename item', message: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete file or folder
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path') || ''
    const name = searchParams.get('name') || ''
    const normalizedPath = normalizePath(path)

    // Security check
    if (!isPathAllowed(normalizedPath)) {
      return NextResponse.json(
        { error: 'Access denied', message: 'You do not have permission to delete items here.' },
        { status: 403 }
      )
    }

    // Additional security: Don't allow deleting system folders
    const systemFolders = ['Documents', 'Downloads', 'Desktop', 'Music', 'Pictures', 'Applications']
    if (systemFolders.includes(name)) {
      return NextResponse.json(
        { error: 'Cannot delete system folder', message: 'System folders cannot be deleted.' },
        { status: 403 }
      )
    }

    // In a real app, this would delete the actual file/folder
    console.log(`Deleting "${name}" from ${normalizedPath}`)

    return NextResponse.json({
      success: true,
      message: 'Item moved to trash',
    })
  } catch (error: any) {
    console.error('Filesystem DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete item', message: error.message },
      { status: 500 }
    )
  }
}

