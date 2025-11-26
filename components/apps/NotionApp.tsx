'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, Reorder, useDragControls } from 'framer-motion'

type BlockType = 'text' | 'heading' | 'quote'

interface Block {
  id: string
  type: BlockType
  content: string
}

const STORAGE_KEY = 'meos-notion-workspace'

const createBlock = (type: BlockType = 'text'): Block => ({
  id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  type,
  content: '',
})

const blockPlaceholders: Record<BlockType, string> = {
  heading: 'Heading 1',
  text: 'Write, press space for AI, “/” for commands…',
  quote: 'Empty quote',
}

const blockStyles: Record<BlockType, React.CSSProperties> = {
  text: { fontSize: '16px', lineHeight: '28px', fontWeight: 400 },
  heading: { fontSize: '32px', fontWeight: 600, lineHeight: '40px' },
  quote: {
    fontSize: '16px',
    fontStyle: 'italic',
    borderLeft: '3px solid rgba(55, 53, 47, 0.3)',
    paddingLeft: '12px',
    color: 'rgba(55, 53, 47, 0.7)',
  },
}

export default function NotionApp() {
  const [blocks, setBlocks] = useState<Block[]>([createBlock()])
  const [pageTitle, setPageTitle] = useState("Máté's Home")
  const [pageIcon, setPageIcon] = useState('📘')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const titleRef = useRef<HTMLDivElement | null>(null)

  // Load from cloud (fallback to localStorage)
  useEffect(() => {
    let isMounted = true

    const loadWorkspace = async () => {
      try {
        const response = await fetch('/api/notion')
        if (response.ok) {
          const data = await response.json()
          const workspace = data.workspace
          if (workspace && isMounted) {
            setBlocks(workspace.blocks?.length ? workspace.blocks : [createBlock()])
            setPageTitle(workspace.pageTitle || "Máté's Home")
            setPageIcon(workspace.pageIcon || '📘')
            if (workspace.lastModified) setLastSaved(new Date(workspace.lastModified))
            setIsLoaded(true)
            return
          }
        }
      } catch (error) {
        console.warn('Cloud workspace unavailable, using local data.')
      }

      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.blocks?.length) setBlocks(parsed.blocks)
          if (parsed.pageTitle) setPageTitle(parsed.pageTitle)
          if (parsed.pageIcon) setPageIcon(parsed.pageIcon)
          if (parsed.lastModified) setLastSaved(new Date(parsed.lastModified))
        } catch (error) {
          console.error('Failed to load Notion workspace:', error)
        }
      }
      if (isMounted) setIsLoaded(true)
    }

    loadWorkspace()

    return () => {
      isMounted = false
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (!isLoaded) return
    const payload = {
      blocks,
      pageTitle,
      pageIcon,
      lastModified: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setLastSaved(new Date())
  }, [blocks, pageTitle, pageIcon, isLoaded])

  // Online/offline indicator
  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine)
    handleStatus()
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  // Close block menus on outside click
  useEffect(() => {
    const handleClick = () => setActiveMenuId(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const focusBlock = useCallback((id: string, moveToEnd = true) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current[id]
      if (el) {
        el.focus()
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(el)
        range.collapse(moveToEnd)
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
    })
  }, [])

  const handleBlockInput = (id: string, text: string) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, content: text } : block)))
  }

  const insertBlockAfter = (index: number, type: BlockType = 'text') => {
    const newBlock = createBlock(type)
    setBlocks((prev) => {
      const next = [...prev]
      next.splice(index + 1, 0, newBlock)
      return next
    })
    focusBlock(newBlock.id, false)
  }

  const deleteBlock = (id: string, index: number) => {
    if (blocks.length === 1) return
    const targetId = blocks[index - 1]?.id || blocks[index + 1]?.id
    setBlocks((prev) => prev.filter((block) => block.id !== id))
    if (targetId) focusBlock(targetId)
  }

  const duplicateBlock = (id: string, index: number) => {
    const source = blocks[index]
    if (!source) return
    const clone = { ...source, id: createBlock().id }
    setBlocks((prev) => {
      const next = [...prev]
      next.splice(index + 1, 0, clone)
      return next
    })
    focusBlock(clone.id)
  }

  const changeBlockType = (id: string, type: BlockType) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, type } : block)))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, block: Block, index: number) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      insertBlockAfter(index)
    }

    if (event.key === 'Backspace' && !block.content && blocks.length > 1) {
      event.preventDefault()
      deleteBlock(block.id, index)
    }
  }

  const syncToCloud = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks,
          pageTitle,
          pageIcon,
          lastModified: new Date().toISOString(),
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.lastModified) {
          setLastSaved(new Date(data.lastModified))
        }
      }
    } catch (error) {
      console.error('Failed to sync Notion workspace:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== pageTitle) {
      titleRef.current.textContent = pageTitle
    }
  }, [pageTitle])

  return (
    <div className="flex h-full" style={{ background: '#F7F6F3', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Sidebar */}
      <aside
        className="w-56 border-r px-4 py-6 flex flex-col gap-4"
        style={{ background: '#F2F1EE', borderColor: '#E3E1DA', color: '#4F4B45' }}
      >
        <p className="text-xs tracking-wide font-semibold mb-2">PRIVATE</p>
        <button className="w-full text-left px-2 py-2 rounded bg-white text-sm flex items-center gap-2 font-medium text-[#2F2A24] shadow-sm">
          <span>📝</span>
          Journal
        </button>
      </aside>

      {/* Canvas */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-12 py-12">
          <div className="flex items-center gap-4 mb-6">
            <button
              className="text-4xl"
              onClick={() => {
                const icons = ['📘', '📗', '📙', '📒', '🗂️', '📝', '🚀', '💡']
                const currentIndex = icons.indexOf(pageIcon)
                setPageIcon(icons[(currentIndex + 1) % icons.length])
              }}
              title="Change page icon"
            >
              {pageIcon}
            </button>
            <div
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              className="outline-none text-4xl font-semibold text-[#37352F] notion-page-title"
              data-placeholder="Untitled"
              onInput={(event) => setPageTitle(event.currentTarget.textContent || 'Untitled')}
            />
          </div>

          <div className="flex items-center gap-3 mb-6 text-xs uppercase tracking-wide text-[#8F8C86]">
            <span className="px-2 py-1 rounded-full border" style={{ borderColor: isOnline ? '#B0AEA7' : '#E65054', color: isOnline ? '#6D6A65' : '#E65054' }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {lastSaved && <span>Last saved {lastSaved.toLocaleTimeString()}</span>}
            <motion.button
              onClick={syncToCloud}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-3 py-1 rounded-md"
              style={{
                background: '#F0EFEA',
                border: '1px solid #DDD9D2',
                color: '#4F4B45',
              }}
              disabled={isSyncing}
            >
              {isSyncing ? 'Syncing…' : 'Sync'}
            </motion.button>
          </div>

          <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-1">
            {blocks.map((block, index) => (
              <BlockRow
                key={block.id}
                block={block}
                index={index}
                onInput={handleBlockInput}
                onKeyDown={handleKeyDown}
                onCreateBelow={() => insertBlockAfter(index)}
                onDelete={() => deleteBlock(block.id, index)}
                onDuplicate={() => duplicateBlock(block.id, index)}
                onChangeType={(type) => changeBlockType(block.id, type)}
                blockRefs={blockRefs}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
              />
            ))}
          </Reorder.Group>

          <button
            className="mt-6 text-sm text-[#8F8C86] hover:text-[#4F4B45]"
            onClick={() => insertBlockAfter(blocks.length - 1)}
          >
            + Add block
          </button>
        </div>
      </main>
      </div>
  )
}

interface BlockRowProps {
  block: Block
  index: number
  onInput: (id: string, text: string) => void
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, block: Block, index: number) => void
  onCreateBelow: () => void
  onDelete: () => void
  onDuplicate: () => void
  onChangeType: (type: BlockType) => void
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  activeMenuId: string | null
  setActiveMenuId: (id: string | null) => void
}

function BlockRow({
  block,
  index,
  onInput,
  onKeyDown,
  onDelete,
  onDuplicate,
  onChangeType,
  blockRefs,
  activeMenuId,
  setActiveMenuId,
}: BlockRowProps) {
  const controls = useDragControls()

  return (
    <Reorder.Item value={block} dragControls={controls} dragListener={false}>
      <div className="group flex items-start gap-2 relative">
        <div className="pt-1">
          <button
            className="opacity-0 group-hover:opacity-100 transition text-lg text-[#B0AEA7] hover:text-[#4F4B45] px-1"
            onPointerDown={(event) => controls.start(event)}
            onClick={(event) => {
              event.stopPropagation()
              setActiveMenuId(activeMenuId === block.id ? null : block.id)
            }}
            title="Drag to move. Click for block tools."
          >
            ⋮⋮
          </button>

          {activeMenuId === block.id && (
            <div
              className="absolute z-20 bg-white shadow-xl rounded-md border mt-2 w-48 text-sm py-2"
              style={{ borderColor: '#E3E1DA' }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="px-3 text-xs uppercase text-[#A5A19A] tracking-wide mb-2">Turn into</p>
              {(['text', 'heading', 'quote'] as BlockType[]).map((type) => (
                <button
                  key={type}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F7F6F3]"
                  onClick={() => {
                    onChangeType(type)
                    setActiveMenuId(null)
                  }}
                >
                  {type === 'text' && 'Text'}
                  {type === 'heading' && 'Heading 1'}
                  {type === 'quote' && 'Quote'}
                </button>
              ))}
              <hr className="my-2 border-[#F0EEE8]" />
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#F7F6F3]"
                onClick={() => {
                  onDuplicate()
                  setActiveMenuId(null)
                }}
              >
                Duplicate
              </button>
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-[#FFF4F4] text-[#C6463D]"
                onClick={() => {
                  onDelete()
                  setActiveMenuId(null)
                }}
              >
                Delete
              </button>
            </div>
          )}
          </div>

        <div className="flex-1 py-1">
          <div
            ref={(el) => {
              blockRefs.current[block.id] = el
              if (el && el.textContent !== block.content) {
                el.textContent = block.content
              }
            }}
            contentEditable
            suppressContentEditableWarning
            data-placeholder={blockPlaceholders[block.type]}
            className={`outline-none notion-block-input ${block.type === 'quote' ? 'quote-block' : ''}`}
            style={blockStyles[block.type]}
            onInput={(event) => onInput(block.id, event.currentTarget.textContent || '')}
            onKeyDown={(event) => onKeyDown(event, block, index)}
          />
        </div>
      </div>
    </Reorder.Item>
  )
}