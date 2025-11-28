'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'

type ElectronTerminalAPI =
  | undefined
  | {
      run: (command: string, options?: { cwd?: string }) => Promise<{ id: string }>
      kill: (id: string) => Promise<{ ok: boolean; message?: string }>
      onData: (id: string, listener: (data: string) => void) => () => void
      onExit: (
        id: string,
        listener: (payload: { code: number; error?: string }) => void
      ) => () => void
    }

declare global {
  interface Window {
    electronAPI?: {
      terminal?: ElectronTerminalAPI
    }
  }
}

export default function TerminalApp() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const termRef = useRef<Terminal | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null)
  const [isElectronTerminal, setIsElectronTerminal] = useState(false)

  const getPrompt = () => '$ '

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
      fontSize: 13,
      fontFamily: '"Fira Code", "Courier New", monospace',
      cursorBlink: true,
    })

    term.open(containerRef.current)
    term.write(`\x1b[36m${getPrompt()}\x1b[0m`)
    termRef.current = term

    let currentLine = ''
    term.onData((data) => {
      if (data === '\r' || data === '\n') {
        const command = currentLine.trim()
        currentLine = ''
        if (command) {
          runCommand(command)
        } else {
          term.write(`\r\n\x1b[36m${getPrompt()}\x1b[0m`)
        }
      } else if (data === '\x7f' || data === '\b') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data >= ' ') {
        currentLine += data
        term.write(data)
      }
    })

    return () => {
      term.dispose()
      termRef.current = null
    }
  }, [])

  const runCommand = async (command: string) => {
    if (!termRef.current) return
    const term = termRef.current
    term.write('\r\n')

    const hasElectron =
      typeof window !== 'undefined' && !!window.electronAPI?.terminal

    // Electron backend when available
    if (hasElectron && window.electronAPI?.terminal) {
      try {
        setIsElectronTerminal(true)
        const api = window.electronAPI.terminal
        const { id } = await api!.run(command)
        setActiveTerminalId(id)

        const disposeData = api!.onData(id, (data: string) => {
          term.write(data)
        })

        const disposeExit = api!.onExit(
          id,
          ({ code, error }: { code: number; error?: string }) => {
            if (error) {
              term.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`)
            }
            term.write(`\r\nProcess exited with code ${code}\r\n`)
            term.write(`\x1b[36m${getPrompt()}\x1b[0m`)
            setActiveTerminalId(null)
            disposeData()
            disposeExit()
          }
        )
      } catch (error: any) {
        term.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`)
        term.write(`\x1b[36m${getPrompt()}\x1b[0m`)
        setActiveTerminalId(null)
      }
      return
    }

    // HTTP fallback (browser / Vercel)
    setIsElectronTerminal(false)
    try {
      abortControllerRef.current = new AbortController()
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        term.write(`\x1b[31mError: ${error.error}\x1b[0m\r\n`)
        term.write(`\x1b[36m${getPrompt()}\x1b[0m`)
        return
      }

      const commandId = response.headers.get('x-terminal-id')
      if (commandId) {
        setActiveTerminalId(commandId)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          term.write(text)
        }
      }

      term.write(`\r\n\x1b[36m${getPrompt()}\x1b[0m`)
      setActiveTerminalId(null)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        term.write('\r\n\x1b[33mCommand cancelled\x1b[0m\r\n')
      } else {
        term.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`)
      }
      term.write(`\x1b[36m${getPrompt()}\x1b[0m`)
      setActiveTerminalId(null)
    }
  }

  const stopCommand = async () => {
    if (!activeTerminalId) {
      abortControllerRef.current?.abort()
      return
    }

    const hasElectron =
      typeof window !== 'undefined' && !!window.electronAPI?.terminal

    try {
      if (hasElectron && isElectronTerminal && window.electronAPI?.terminal) {
        await window.electronAPI.terminal.kill(activeTerminalId)
      } else {
        await fetch(`/api/terminal?id=${activeTerminalId}`, { method: 'DELETE' })
      }
    } catch (error) {
      console.error('Failed to stop command:', error)
    } finally {
      abortControllerRef.current?.abort()
      setActiveTerminalId(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-black text-white">
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <span>💻</span>
          <span>Terminal</span>
          {window.electronAPI?.terminal && (
            <span className="text-xs text-green-400 ml-2">Electron shell</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTerminalId && (
            <button
              onClick={stopCommand}
              className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ padding: '4px' }}
        />
      </div>
    </div>
  )
}


