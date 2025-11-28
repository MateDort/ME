'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CLAUDE_MODELS, GEMINI_MODELS, DEFAULT_AGENT_MODEL, DEFAULT_ASK_MODEL } from '@/lib/models'
import { LanguageProfile, DEFAULT_LANGUAGE_PROFILE, mergeLanguageProfile } from '@/lib/language'
import { ApiProvider, getApiKey } from '@/lib/api-config'
import { Terminal } from '@xterm/xterm'

interface ProjectFile {
  path: string
  type: string
  content: string
  description: string
  edited?: boolean
}

interface Todo {
  id: number
  task: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface Project {
  id: string
  name: string
  type: string
  language: string
  runtime?: string
  framework?: string
  buildCommand?: string
  startCommand?: string
  installCommand?: string
  description: string
  todos: Todo[]
  files: ProjectFile[]
  createdAt: Date
  languageProfile: LanguageProfile
}

interface AgentThought {
  id: string
  thought: string
  file?: string
  action: 'thinking' | 'editing' | 'done'
  timestamp: Date
}

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'agent' | 'system'
  timestamp: Date
  image?: string
  editedFiles?: string[]
}

type Mode = 'agent' | 'ask'
type Model = string

const STORAGE_KEY = 'cursor_projects'
const LEGACY_STORAGE_KEY = 'brainstorm_projects'
const LANGUAGE_CHOICES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'C#',
  'Java',
  'HTML',
]
type ApiKeyPayload = Partial<Record<ApiProvider, { apiKey: string; endpoint?: string }>>

const getProviderFromModel = (modelName: string): ApiProvider => {
  if (CLAUDE_MODELS.includes(modelName)) return 'claude'
  if (GEMINI_MODELS.includes(modelName)) return 'gemini'
  if (modelName.toLowerCase().includes('gpt') || modelName.toLowerCase().includes('openai')) return 'openai'
  return 'custom'
}

const formatProviderName = (provider: ApiProvider) => {
  switch (provider) {
    case 'claude':
      return 'Claude'
    case 'gemini':
      return 'Gemini'
    case 'openai':
      return 'OpenAI'
    case 'custom':
    default:
      return 'Custom'
  }
}

export default function CursorApp() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [mode, setMode] = useState<Mode>('agent')
  const [model, setModel] = useState<Model>(DEFAULT_AGENT_MODEL)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [currentThought, setCurrentThought] = useState<AgentThought | null>(null)
  const [editedFilesThisSession, setEditedFilesThisSession] = useState<string[]>([])
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [apiKeyPayload, setApiKeyPayload] = useState<ApiKeyPayload | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<{ provider: ApiProvider; hasKey: boolean; error?: string } | null>(null)
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalCommand, setTerminalCommand] = useState('')
  const [isRunningCommand, setIsRunningCommand] = useState(false)
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<Terminal | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || !showTerminal) return
    
    // Dispose existing terminal if it exists
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.dispose()
      terminalInstanceRef.current = null
    }

    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      fontSize: 13,
      fontFamily: '"Fira Code", "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
    })

    term.open(terminalRef.current)
    terminalInstanceRef.current = term

    // Write initial prompt after a short delay to ensure selectedProject is available
    setTimeout(() => {
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.write(`\x1b[36m${getTerminalPrompt()}\x1b[0m`)
      }
    }, 100)

    // Handle terminal input
    let currentLine = ''
    term.onData((data) => {
      if (data === '\r' || data === '\n') {
        const command = currentLine.trim()
        currentLine = ''
        if (command) {
          runTerminalCommand(command)
        } else {
          term.write(`\r\n\x1b[36m${getTerminalPrompt()}\x1b[0m`)
        }
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data >= ' ') {
        // Printable characters
        currentLine += data
        term.write(data)
      }
    })

    return () => {
      term.dispose()
      terminalInstanceRef.current = null
    }
  }, [showTerminal])

  const runTerminalCommand = async (command: string) => {
    if (!terminalInstanceRef.current) return

    const term = terminalInstanceRef.current
    term.write('\r\n')

    // Get project directory if available
    const projectDir =
      selectedProject?.id && selectedProject.id !== 'welcome'
      ? `projects/${selectedProject.id}` 
      : undefined

    const hasElectron =
      typeof window !== 'undefined' && (window as any).electronAPI?.terminal

    // Prefer Electron backend when available (desktop shell)
    if (hasElectron) {
      try {
        const api = (window as any).electronAPI.terminal
        const { id } = await api.run(command, { cwd: projectDir })
        setActiveTerminalId(id)

        const disposeData = api.onData(id, (data: string) => {
          term.write(data)
        })

        const disposeExit = api.onExit(
          id,
          ({ code, error }: { code: number; error?: string }) => {
            if (error) {
              term.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`)
            }
            term.write(`\r\nProcess exited with code ${code}\r\n`)
            term.write(`\x1b[36m${getTerminalPrompt()}\x1b[0m`)
            setActiveTerminalId(null)
            disposeData()
            disposeExit()
          }
        )
      } catch (error: any) {
        term.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`)
        term.write(`\x1b[36m${getTerminalPrompt()}\x1b[0m`)
        setActiveTerminalId(null)
      }
      return
    }

    try {
      abortControllerRef.current = new AbortController()
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, cwd: projectDir }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        term.write(`\x1b[31mError: ${error.error}\x1b[0m\r\n`)
        term.write(`\x1b[36m${getTerminalPrompt()}\x1b[0m`)
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

      term.write(`\r\n\x1b[36m${getTerminalPrompt()}\x1b[0m`)
      setActiveTerminalId(null)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        term.write('\r\n\x1b[33mCommand cancelled\x1b[0m\r\n')
      } else {
        term.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`)
      }
      term.write(`\x1b[36m${getTerminalPrompt()}\x1b[0m`)
      setActiveTerminalId(null)
    }
  }

  const stopTerminalCommand = async () => {
    if (!activeTerminalId) {
      abortControllerRef.current?.abort()
      return
    }

    const hasElectron =
      typeof window !== 'undefined' && (window as any).electronAPI?.terminal

    try {
      if (hasElectron) {
        await (window as any).electronAPI.terminal.kill(activeTerminalId)
      } else {
        await fetch(`/api/terminal?id=${activeTerminalId}`, { method: 'DELETE' })
      }
      } catch (e) {
        console.error('Failed to stop command:', e)
    } finally {
      setActiveTerminalId(null)
    abortControllerRef.current?.abort()
    }
  }

  const getTerminalPrompt = () => {
    if (!selectedProject || selectedProject.id === 'welcome') {
      return `cursor $ `
    }
    return `[${selectedProject.name}] $ `
  }

  // Update terminal prompt when project changes
  useEffect(() => {
    if (terminalInstanceRef.current && showTerminal) {
      const term = terminalInstanceRef.current
      term.write(`\r\n\x1b[36m${getTerminalPrompt()}\x1b[0m`)
    }
  }, [selectedProject?.id, showTerminal])

  // Expand root folders by default when project changes
  useEffect(() => {
    if (selectedProject) {
      const tree = buildFileTree(selectedProject.files)
      const rootFolders = tree.filter(node => node.type === 'folder')
      setExpandedFolders(new Set(rootFolders.map(f => f.path)))
    }
  }, [selectedProject?.id])

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, currentThought])

  // Load saved projects from localStorage
  useEffect(() => {
    const savedProjects =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects)
        const projectsWithDates = parsed.map((p: any) => {
          const profile = mergeLanguageProfile(
            DEFAULT_LANGUAGE_PROFILE,
            p.languageProfile || { language: p.language }
          )
          return {
            ...p,
            language: profile.language,
            runtime: p.runtime || profile.runtime,
            framework: p.framework || profile.framework,
            buildCommand: p.buildCommand || profile.buildCommand,
            startCommand: p.startCommand || profile.startCommand,
            installCommand: p.installCommand || profile.packageManager,
            languageProfile: profile,
            createdAt: new Date(p.createdAt),
          }
        })
        setProjects(projectsWithDates)
        if (projectsWithDates.length > 0) {
          setSelectedProject(projectsWithDates[0])
        }
      } catch (e) {
        console.error('Error loading saved projects:', e)
      }
    }
  }, [])

  const fetchApiKeyForModel = useCallback(async () => {
    const provider = getProviderFromModel(model)
    try {
      const record = await getApiKey(provider)
      if (record?.apiKey) {
        return {
          provider,
          payload: {
            [provider]: { apiKey: record.apiKey, endpoint: record.endpoint },
          } as ApiKeyPayload,
        }
      }
      return { provider, payload: null as ApiKeyPayload | null }
    } catch (error: any) {
      return {
        provider,
        payload: null as ApiKeyPayload | null,
        error: error?.message || 'Unlock keys in System Preferences and set a passphrase.',
      }
    }
  }, [model])

  const updateApiKeyState = useCallback(async () => {
    const result = await fetchApiKeyForModel()
    setApiKeyPayload(result.payload)
    setApiKeyStatus({
      provider: result.provider,
      hasKey: Boolean(result.payload),
      error: result.error,
    })
    return result.payload
  }, [fetchApiKeyForModel])

  useEffect(() => {
    updateApiKeyState()
  }, [updateApiKeyState])

  useEffect(() => {
    const handler = () => {
      updateApiKeyState()
    }
    window.addEventListener('cursor-api-keys-updated', handler as EventListener)
    return () => {
      window.removeEventListener('cursor-api-keys-updated', handler as EventListener)
    }
  }, [updateApiKeyState])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
    }
  }, [projects])

  // Default welcome project
  useEffect(() => {
    if (projects.length === 0 && !selectedProject) {
      const welcomeProject: Project = {
        id: 'welcome',
        name: 'Welcome',
        type: 'web',
        language: DEFAULT_LANGUAGE_PROFILE.language,
        runtime: DEFAULT_LANGUAGE_PROFILE.runtime,
        framework: DEFAULT_LANGUAGE_PROFILE.framework,
        buildCommand: DEFAULT_LANGUAGE_PROFILE.buildCommand || 'none',
        startCommand: DEFAULT_LANGUAGE_PROFILE.startCommand || 'Open index.html',
        installCommand: DEFAULT_LANGUAGE_PROFILE.packageManager || 'none',
        description: 'Welcome to Cursor',
        todos: [],
        files: [
          {
            path: 'index.html',
            type: 'html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cursor</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 600px;
    }
    h1 {
      font-size: 3rem;
      margin-bottom: 20px;
      background: linear-gradient(90deg, #e94560, #0f3460);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 1.2rem;
      line-height: 1.8;
      opacity: 0.9;
      margin-bottom: 30px;
    }
    .features {
      display: grid;
      gap: 15px;
      text-align: left;
    }
    .feature {
      background: rgba(255,255,255,0.1);
      padding: 15px 20px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }
    .feature strong { color: #e94560; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖥️ Cursor</h1>
    <p>Your retro-futuristic AI workspace. Build anything with natural language.</p>
    <div class="features">
      <div class="feature"><strong>Agent Mode:</strong> Build and edit code automatically</div>
      <div class="feature"><strong>Ask Mode:</strong> Get answers about your code</div>
      <div class="feature"><strong>Live Preview:</strong> See changes in real-time</div>
    </div>
  </div>
</body>
</html>`,
            description: 'Welcome page',
          },
        ],
        createdAt: new Date(),
        languageProfile: { ...DEFAULT_LANGUAGE_PROFILE },
      }
      setProjects([welcomeProject])
      setSelectedProject(welcomeProject)
    }
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const ensureApiKeyPayload = useCallback(async () => {
    if (apiKeyPayload) return apiKeyPayload
    return updateApiKeyState()
  }, [apiKeyPayload, updateApiKeyState])

  const showThought = (thought: string, file?: string, action: 'thinking' | 'editing' | 'done' = 'thinking') => {
    setCurrentThought({
      id: Date.now().toString(),
      thought,
      file,
      action,
      timestamp: new Date(),
    })
  }

  const clearThought = () => {
    setCurrentThought(null)
  }

  // Start editing a message
  const startEditingMessage = (message: ChatMessage) => {
    if (isGenerating) return
    if (message.sender !== 'user') return
    setEditingMessageId(message.id)
    setEditingText(message.text)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingMessageId(null)
    setEditingText('')
  }

  // Submit edited message - removes all messages after and regenerates
  const submitEditedMessage = async () => {
    if (!editingMessageId || !editingText.trim()) return
    if (isGenerating) return

    const messageIndex = chatMessages.findIndex(m => m.id === editingMessageId)
    if (messageIndex === -1) return

    const originalMessage = chatMessages[messageIndex]
    const messagesBeforeEdit = chatMessages.slice(0, messageIndex)
    setChatMessages(messagesBeforeEdit)

    setEditingMessageId(null)
    setEditingText('')
    setChatInput(editingText)
    if (originalMessage.image) {
      setUploadedImage(originalMessage.image)
    }

    setTimeout(() => {
      handleSendMessageWithText(editingText, originalMessage.image)
    }, 50)
  }

  const handleSendMessageWithText = async (text: string, image?: string) => {
    if (!text.trim() && !image) return
    if (isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date(),
      image: image || undefined,
    }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setUploadedImage(null)
    setIsGenerating(true)
    setEditedFilesThisSession([])

    try {
      if (mode === 'agent') {
        await handleAgentMode(text, image)
      } else {
        await handleAskMode(text, image)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      clearThought()
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      clearThought()
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() && !uploadedImage) return
    if (isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      sender: 'user',
      timestamp: new Date(),
      image: uploadedImage || undefined,
    }
    setChatMessages((prev) => [...prev, userMessage])
    const inputText = chatInput
    setChatInput('')
    setUploadedImage(null)
    setIsGenerating(true)
    setEditedFilesThisSession([])

    try {
      if (mode === 'agent') {
        await handleAgentMode(inputText, userMessage.image)
      } else {
        await handleAskMode(inputText, userMessage.image)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      clearThought()
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
      clearThought()
    }
  }

  const handleAgentMode = async (prompt: string, image?: string) => {
    const isEditRequest = selectedProject && selectedProject.id !== 'welcome' && 
      (prompt.toLowerCase().includes('change') || 
       prompt.toLowerCase().includes('edit') || 
       prompt.toLowerCase().includes('update') ||
       prompt.toLowerCase().includes('modify') ||
       prompt.toLowerCase().includes('make the') ||
       prompt.toLowerCase().includes('replace'))

    if (isEditRequest && selectedProject) {
      await handleEditFiles(prompt, image)
    } else if (!selectedProject || selectedProject.id === 'welcome') {
      await handleCreateProject(prompt)
    } else {
      await handleEditFiles(prompt, image)
    }
  }

  const handleCreateProject = async (prompt: string) => {
    showThought(`Analyzing your request...`, undefined, 'thinking')
    await new Promise(r => setTimeout(r, 500))
    
    showThought('Creating project plan and file structure...', undefined, 'thinking')
    
    const apiKeysPayload = await ensureApiKeyPayload()

    const response = await fetch('/api/generate-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        apiKeys: apiKeysPayload || undefined,
      }),
    })

    const data = await response.json()
    if (data.plan) {
      const planProfile = mergeLanguageProfile(
        DEFAULT_LANGUAGE_PROFILE,
        data.plan.languageProfile
      )
      const installCommand =
        data.plan.commands?.install || planProfile.packageManager || 'npm install'
      const newProject: Project = {
        id: Date.now().toString(),
        name: data.plan.name || 'New Project',
        type: data.plan.type || 'web',
        language: planProfile.language,
        runtime: data.plan.runtime || planProfile.runtime,
        framework: data.plan.framework || planProfile.framework,
        buildCommand: data.plan.commands?.build || planProfile.buildCommand,
        startCommand: data.plan.commands?.start || planProfile.startCommand,
        installCommand,
        description: prompt,
        todos: data.plan.todos || [],
        files: data.plan.files.map((f: any) => ({
          ...f,
          content: '',
          edited: false,
        })),
        createdAt: new Date(),
        languageProfile: planProfile,
      }

      setProjects((prev) => prev.filter(p => p.id !== 'welcome').concat(newProject))
      setSelectedProject(newProject)

      const planMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `📋 Creating: ${newProject.name}\n\nFiles to generate:\n${newProject.files.map(f => `• ${f.path}`).join('\n')}`,
        sender: 'system',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, planMessage])

      const editedFiles: string[] = []
      for (let i = 0; i < newProject.files.length; i++) {
        const file = newProject.files[i]
        const todo = newProject.todos[i] || { task: `Create ${file.path}` }

        showThought(`Creating ${file.path}...`, file.path, 'thinking')
        await new Promise(r => setTimeout(r, 800))

        showThought(`Writing code for ${file.path}...`, file.path, 'editing')

        try {
          const fileResponse = await fetch('/api/generate-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filePath: file.path,
              fileType: file.type,
              projectDescription: newProject.description,
              existingFiles: newProject.files
                .filter((f, idx) => idx < i && f.content)
                .map((f) => ({ path: f.path, content: f.content })),
              todo,
              model,
              languageProfile: newProject.languageProfile,
              apiKeys: apiKeysPayload || undefined,
            }),
          })

          const fileData = await fileResponse.json()
          const content = fileData.code || `// Error generating ${file.path}`

          setProjects((prev) => {
            const updated = prev.map((p) => {
              if (p.id === newProject.id) {
                const updatedFiles = p.files.map((f, idx) =>
                  idx === i ? { ...f, content, edited: true } : f
                )
                const updatedTodos = p.todos.map((t, idx) =>
                  idx === i ? { ...t, status: 'completed' as const } : t
                )
                const updatedProject = { ...p, files: updatedFiles, todos: updatedTodos }
                setSelectedProject(updatedProject)
                return updatedProject
              }
              return p
            })
            return updated
          })

          editedFiles.push(file.path)
          showThought(`✓ ${file.path} created`, file.path, 'done')
          await new Promise(r => setTimeout(r, 500))

        } catch (error) {
          console.error(`Error generating ${file.path}:`, error)
          showThought(`✗ Error creating ${file.path}`, file.path, 'done')
          await new Promise(r => setTimeout(r, 500))
        }
      }

      clearThought()
      const doneMessage: ChatMessage = {
        id: `done-${Date.now()}`,
        text: `✅ Project complete!\n\nFiles created:`,
        sender: 'agent',
        timestamp: new Date(),
        editedFiles,
      }
      setChatMessages((prev) => [...prev, doneMessage])
      setEditedFilesThisSession(editedFiles)
    }
  }

  const handleEditFiles = async (prompt: string, image?: string) => {
    if (!selectedProject) return

    showThought(`Reading your files...`, undefined, 'thinking')
    await new Promise(r => setTimeout(r, 500))

    showThought('Planning changes...', undefined, 'thinking')
    await new Promise(r => setTimeout(r, 500))

    const imageData = image ? await convertImageToBase64(image) : null

    const filesToEdit = selectedFile 
      ? [selectedProject.files.find(f => f.path === selectedFile)!]
      : selectedProject.files.filter(f => f.content)

    const editedFiles: string[] = []

    const apiKeysPayload = await ensureApiKeyPayload()

    for (const file of filesToEdit) {
      showThought(`Editing ${file.path}...`, file.path, 'thinking')
      await new Promise(r => setTimeout(r, 500))

      showThought(`Making changes to ${file.path}...`, file.path, 'editing')

      try {
        const response = await fetch('/api/generate-with-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Here is my current file "${file.path}":\n\n${file.content}\n\n---\n\nPlease ${prompt}. Return ONLY the complete updated file content, no explanations.`,
            model,
            mode: 'agent',
            image: imageData,
            existingFiles: selectedProject.files
              .filter((f) => f.content)
              .map((f) => ({ path: f.path, content: f.content })),
            projectDescription: selectedProject.description,
            filePath: file.path,
            fileType: file.type,
            languageProfile: selectedProject.languageProfile,
            apiKeys: apiKeysPayload || undefined,
          }),
        })

        const data = await response.json()
        if (data.response) {
          setProjects((prev) => {
            const updated = prev.map((p) => {
              if (p.id === selectedProject.id) {
                const updatedFiles = p.files.map((f) =>
                  f.path === file.path ? { ...f, content: data.response, edited: true } : f
                )
                const updatedProject = { ...p, files: updatedFiles }
                setSelectedProject(updatedProject)
                return updatedProject
              }
              return p
            })
            return updated
          })

          editedFiles.push(file.path)
          showThought(`✓ ${file.path} updated`, file.path, 'done')
          await new Promise(r => setTimeout(r, 500))
        }
      } catch (error) {
        console.error(`Error editing ${file.path}:`, error)
        showThought(`✗ Error editing ${file.path}`, file.path, 'done')
        await new Promise(r => setTimeout(r, 500))
      }
    }

    clearThought()
    if (editedFiles.length > 0) {
      const doneMessage: ChatMessage = {
        id: `done-${Date.now()}`,
        text: `✅ Changes complete!`,
        sender: 'agent',
        timestamp: new Date(),
        editedFiles,
      }
      setChatMessages((prev) => [...prev, doneMessage])
      setEditedFilesThisSession(editedFiles)
    } else {
      const noEditMessage: ChatMessage = {
        id: `noedit-${Date.now()}`,
        text: `Could not make the requested changes. Please try rephrasing.`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, noEditMessage])
    }
  }

  const handleAskMode = async (prompt: string, image?: string) => {
    showThought(`Reading your files...`, undefined, 'thinking')
    await new Promise(r => setTimeout(r, 300))

    showThought('Thinking...', undefined, 'thinking')

    const imageData = image ? await convertImageToBase64(image) : null
    const apiKeysPayload = await ensureApiKeyPayload()

    const response = await fetch('/api/generate-with-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        mode: 'ask',
        image: imageData,
        existingFiles: selectedProject?.files
          .filter((f) => f.content)
          .map((f) => ({ path: f.path, content: f.content })) || [],
        projectDescription: selectedProject?.description || '',
        languageProfile: selectedProject?.languageProfile,
        apiKeys: apiKeysPayload || undefined,
      }),
    })

    clearThought()
    const data = await response.json()
    if (data.response) {
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, agentMessage])
    }
  }

  const convertImageToBase64 = async (dataUrl: string): Promise<{ data: string; mimeType: string }> => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve({
          data: base64,
          mimeType: blob.type || 'image/png',
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const updateProjectFile = (projectId: string, filePath: string, content: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const updatedFiles = p.files.map((f) =>
            f.path === filePath ? { ...f, content, edited: true } : f
          )
          const updatedProject = { ...p, files: updatedFiles }
          if (selectedProject?.id === projectId) {
            setSelectedProject(updatedProject)
          }
          return updatedProject
        }
        return p
      })
      return updated
    })
  }

  const commitSelectedProjectUpdate = (updater: (project: Project) => Project) => {
    if (!selectedProject) return
    const activeId = selectedProject.id
    setProjects((prev) =>
      prev.map((project) => (project.id === activeId ? updater(project) : project))
    )
    setSelectedProject((prev) => (prev ? updater(prev) : prev))
  }

  const handleLanguageProfileChange = (changes: Partial<LanguageProfile>) => {
    if (!selectedProject) return
    commitSelectedProjectUpdate((project) => {
      const nextProfile = mergeLanguageProfile(project.languageProfile || DEFAULT_LANGUAGE_PROFILE, changes)
      const updatedProfile: LanguageProfile = {
        ...nextProfile,
        buildCommand: changes.buildCommand ?? nextProfile.buildCommand,
        startCommand: changes.startCommand ?? nextProfile.startCommand,
        packageManager: changes.packageManager ?? nextProfile.packageManager,
      }
      return {
        ...project,
        languageProfile: updatedProfile,
        language: updatedProfile.language,
        runtime: changes.runtime ?? updatedProfile.runtime ?? project.runtime,
        framework: changes.framework ?? updatedProfile.framework ?? project.framework,
        buildCommand:
          changes.buildCommand ?? project.buildCommand ?? updatedProfile.buildCommand,
        startCommand:
          changes.startCommand ?? project.startCommand ?? updatedProfile.startCommand,
        installCommand:
          changes.packageManager ?? project.installCommand ?? updatedProfile.packageManager,
      }
    })
  }

  const handleCommandChange = (
    field: 'buildCommand' | 'startCommand' | 'installCommand',
    value: string
  ) => {
    if (!selectedProject) return
    commitSelectedProjectUpdate((project) => {
      const nextProfile = { ...(project.languageProfile || DEFAULT_LANGUAGE_PROFILE) }
      if (field === 'buildCommand') {
        nextProfile.buildCommand = value
      }
      if (field === 'startCommand') {
        nextProfile.startCommand = value
      }
      if (field === 'installCommand') {
        nextProfile.packageManager = value
      }
      return {
        ...project,
        [field]: value,
        languageProfile: nextProfile,
      }
    })
  }

  const previewSrcdoc = useMemo(() => {
    if (!selectedProject) return '<html><body style="background:#1a1a2e;color:white;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><p>No preview available</p></body></html>'

    const htmlFile = selectedProject.files.find((f) => f.type === 'html' || f.path.endsWith('.html'))
    const cssFile = selectedProject.files.find((f) => f.type === 'css' || f.path.endsWith('.css'))
    const jsFile = selectedProject.files.find((f) => f.type === 'javascript' || f.path.endsWith('.js'))

    let finalHTML = ''

    if (htmlFile && htmlFile.content) {
      finalHTML = htmlFile.content

      if (cssFile && cssFile.content && !finalHTML.includes(cssFile.content.substring(0, 50))) {
        if (finalHTML.includes('</head>')) {
          finalHTML = finalHTML.replace('</head>', `<style>${cssFile.content}</style></head>`)
        } else if (finalHTML.includes('<body>')) {
          finalHTML = finalHTML.replace('<body>', `<head><style>${cssFile.content}</style></head><body>`)
        }
      }

      if (jsFile && jsFile.content && !finalHTML.includes(jsFile.content.substring(0, 50))) {
        if (finalHTML.includes('</body>')) {
          finalHTML = finalHTML.replace('</body>', `<script>${jsFile.content}</script></body>`)
        } else if (finalHTML.includes('</html>')) {
          finalHTML = finalHTML.replace('</html>', `<script>${jsFile.content}</script></html>`)
        }
      }
    }

    const navigationBlocker = `
      <script>
        document.addEventListener('click', function(e) {
          var target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }
          if (target && target.tagName === 'A' && target.href) {
            e.preventDefault();
          }
        }, true);
        document.addEventListener('submit', function(e) {
          if (!e.defaultPrevented) {
            e.preventDefault();
          }
        }, true);
      </script>
    `;

    let safeHTML = finalHTML
    if (safeHTML.includes('</body>')) {
      safeHTML = safeHTML.replace('</body>', navigationBlocker + '</body>')
    } else if (safeHTML.includes('</html>')) {
      safeHTML = safeHTML.replace('</html>', navigationBlocker + '</html>')
    } else if (safeHTML) {
      safeHTML = safeHTML + navigationBlocker
    }

    return safeHTML || '<html><body style="background:#1a1a2e;color:white;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><p>No preview available</p></body></html>'
  }, [selectedProject?.files, selectedProject?.id])

  const hasHtmlPreview = useMemo(() => {
    if (!selectedProject) return false
    return selectedProject.files.some(
      (f) => f.type === 'html' || f.path.endsWith('.html')
    )
  }, [selectedProject?.files, selectedProject?.id])

  const fileTypeSummary = useMemo(() => {
    if (!selectedProject) return []
    const summary: Record<string, { total: number; completed: number }> = {}
    selectedProject.files.forEach((file) => {
      const key = (file.type || file.path.split('.').pop() || 'other').toLowerCase()
      if (!summary[key]) {
        summary[key] = { total: 0, completed: 0 }
      }
      summary[key].total += 1
      if (file.content) {
        summary[key].completed += 1
      }
    })
    return Object.entries(summary).map(([type, counts]) => ({
      type,
      ...counts,
    }))
  }, [selectedProject?.files, selectedProject?.id])

  const activeProfile = selectedProject?.languageProfile || DEFAULT_LANGUAGE_PROFILE

  const renderInstructionsPanel = () => {
    if (!selectedProject) {
      return (
        <div className="h-full flex items-center justify-center text-[#7a859b]">
          No project selected
        </div>
      )
    }

    return (
      <div className="h-full w-full overflow-y-auto p-6 flex flex-col gap-4 text-[#2a3444]">
        <div className="rounded-2xl border border-[#d4d9ec] bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold tracking-[0.2em] text-[#7b8195]">BUILD STEPS</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#4e8dec]">Install</span>
              <code className="px-2 py-1 bg-[#f5f7ff] rounded">
                {selectedProject.installCommand || activeProfile.packageManager || 'See README'}
              </code>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#4e8dec]">Build</span>
              <code className="px-2 py-1 bg-[#f5f7ff] rounded">
                {selectedProject.buildCommand || activeProfile.buildCommand || 'n/a'}
              </code>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[#4e8dec]">Start</span>
              <code className="px-2 py-1 bg-[#f5f7ff] rounded">
                {selectedProject.startCommand || activeProfile.startCommand || 'n/a'}
              </code>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#d4d9ec] bg-white shadow-sm p-4 space-y-2 text-sm">
          <p className="text-xs font-bold tracking-[0.2em] text-[#7b8195]">LANGUAGE PROFILE</p>
          <p><strong>Language:</strong> {activeProfile.language}</p>
          {activeProfile.framework && <p><strong>Framework:</strong> {activeProfile.framework}</p>}
          {activeProfile.runtime && <p><strong>Runtime:</strong> {activeProfile.runtime}</p>}
          {selectedProject.description && (
            <p className="text-xs text-[#6b728a] leading-relaxed">{selectedProject.description}</p>
          )}
        </div>
      </div>
    )
  }

  // Build tree structure from files
  interface FileTreeNode {
    name: string
    path: string
    type: 'file' | 'folder'
    children?: FileTreeNode[]
    file?: ProjectFile
  }

  const buildFileTree = (files: ProjectFile[]): FileTreeNode[] => {
    const tree: FileTreeNode[] = []
    const pathMap = new Map<string, FileTreeNode>()

    files.forEach((file) => {
      // Skip .gitkeep files from display (they're just folder placeholders)
      if (file.path.endsWith('/.gitkeep')) {
        const folderPath = file.path.replace('/.gitkeep', '')
        if (!pathMap.has(folderPath)) {
          const parts = folderPath.split('/')
          const node: FileTreeNode = {
            name: parts[parts.length - 1],
            path: folderPath,
            type: 'folder',
            children: [],
          }
          pathMap.set(folderPath, node)
          
          if (parts.length === 1) {
            tree.push(node)
          } else {
            const parentPath = parts.slice(0, -1).join('/')
            const parent = pathMap.get(parentPath)
            if (parent && parent.children) {
              parent.children.push(node)
            }
          }
        }
        return
      }

      const parts = file.path.split('/')
      let currentPath = ''
      
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1
        currentPath = currentPath ? `${currentPath}/${part}` : part
        
        if (!pathMap.has(currentPath)) {
          const node: FileTreeNode = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'folder',
            children: isLast ? undefined : [],
            file: isLast ? file : undefined,
          }
          pathMap.set(currentPath, node)
          
          if (index === 0) {
            tree.push(node)
          } else {
            const parentPath = parts.slice(0, index).join('/')
            const parent = pathMap.get(parentPath)
            if (parent && parent.children) {
              parent.children.push(node)
            }
          }
        } else if (isLast) {
          // Update file reference if it already exists
          const existing = pathMap.get(currentPath)
          if (existing) {
            existing.file = file
          }
        }
      })
    })

    // Sort tree: folders first, then files, both alphabetically
    const sortTree = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      }).map(node => {
        if (node.children) {
          node.children = sortTree(node.children)
        }
        return node
      })
    }

    return sortTree(tree)
  }

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }

  const handleNewFile = () => {
    if (!selectedProject) return
    const fileName = prompt('Enter file name (e.g., newfile.js):')
    if (!fileName) return
    
    const newFile: ProjectFile = {
      path: fileName,
      type: fileName.split('.').pop() || 'text',
      content: '',
      description: '',
    }
    
    commitSelectedProjectUpdate((project) => ({
      ...project,
      files: [...project.files, newFile],
    }))
    
    setSelectedFile(fileName)
  }

  const handleNewFolder = () => {
    if (!selectedProject) return
    const folderName = prompt('Enter folder name:')
    if (!folderName) return
    
    // Create a placeholder file to represent the folder
    // In a real implementation, you'd track folders separately
    const newFile: ProjectFile = {
      path: `${folderName}/.gitkeep`,
      type: 'text',
      content: '',
      description: '',
    }
    
    commitSelectedProjectUpdate((project) => ({
      ...project,
      files: [...project.files, newFile],
    }))
    
    // Expand the new folder
    setExpandedFolders((prev) => new Set([...prev, folderName]))
  }

  const handleFileSelect = (filePath: string) => {
    setSelectedFile(filePath)
  }

  const handleFileEdit = (content: string) => {
    if (selectedProject && selectedFile) {
      updateProjectFile(selectedProject.id, selectedFile, content)
    }
  }

  const currentFileContent = selectedProject?.files.find((f) => f.path === selectedFile)?.content || ''

  const formatModelName = (m: string) => {
    if (m.includes('claude')) {
      // Claude model formatting - clean and readable
      let name = m
        .replace('claude-opus-4-5-20251101', 'Claude Opus 4.5')
        .replace('claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5')
        .replace('claude-haiku-4-5-20251001', 'Claude Haiku 4.5')
        .replace('claude-opus-4-1-20250805', 'Claude Opus 4.1')
        .replace('claude-3-5-', 'Claude 3.5 ')
        .replace('claude-3-', 'Claude 3 ')
        .replace('-20251101', '')
        .replace('-20251001', '')
        .replace('-20250929', '')
        .replace('-20250805', '')
        .replace('-20241022', '')
        .replace('-20240307', '')
        .replace('-20240229', '')
      
      // Capitalize first letter of model type
      const parts = name.split(' ')
      if (parts.length > 1) {
        parts[parts.length - 1] = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1)
        name = parts.join(' ')
    }
      return name
    }
    // Gemini model formatting
    let name = m
      .replace('gemini-3.0-pro', 'Gemini 3.0 Pro')
      .replace('gemini-3.0-flash', 'Gemini 3.0 Flash')
      .replace('gemini-1.5-pro-latest', 'Gemini 1.5 Pro (Latest)')
      .replace('gemini-1.5-flash-latest', 'Gemini 1.5 Flash (Latest)')
      .replace('gemini-1.5-pro', 'Gemini 1.5 Pro')
      .replace('gemini-1.5-flash', 'Gemini 1.5 Flash')
      .replace('gemini-pro', 'Gemini Pro')
      .replace('gemini-', 'Gemini ')
    
    // Capitalize properly
    if (!name.startsWith('Gemini')) {
      name = 'Gemini ' + name
    }
    return name
  }

  const windowBackground = `
    linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(230,230,255,0.85) 100%)
  `
  const chromeBackground = `
    linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(210,210,235,0.85) 100%)
  `
  const panelBackground = `
    linear-gradient(180deg, rgba(246,248,255,0.9) 0%, rgba(226,230,245,0.9) 100%)
  `

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden text-[#1b1b1b]"
      style={{
        fontFamily: '"Lucida Grande", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: windowBackground,
      }}
    >
      {/* Top bar with mode and model */}
      <div
        className="px-5 py-2 border-b flex items-center gap-4"
        style={{
          background: chromeBackground,
          borderColor: 'rgba(140,150,175,0.4)',
        }}
      >
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#4b4b4b]">
            {mode === 'agent' ? 'Agent Mode' : 'Ask Mode'}
          </span>
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: 'linear-gradient(180deg, #4e8dec 0%, #316fce 100%)',
              color: 'white',
              boxShadow: '0 3px 6px rgba(0,0,0,0.2)',
            }}
          >
            {formatModelName(model)}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          {/* Files Panel */}
          <div
            className="w-60 border-r flex flex-col"
            style={{
              background: panelBackground,
              borderColor: 'rgba(140,150,175,0.6)',
            }}
          >
            {/* File Explorer Header */}
            <div
              className="px-3 py-2 border-b flex items-center justify-between"
              style={{
                borderColor: 'rgba(140,150,175,0.4)',
                background: 'linear-gradient(180deg, rgba(246,248,255,0.95) 0%, rgba(226,230,245,0.95) 100%)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-[0.2em] text-[#4a5866]">EXPLORER</span>
                {selectedProject && (
                  <span className="text-[10px] text-[#7b8195]">({selectedProject.name})</span>
                )}
              </div>
              {selectedProject && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewFile}
                    className="w-5 h-5 flex items-center justify-center hover:bg-white/60 rounded text-[#4a5866] text-[11px] leading-none"
                    title="New File"
                  >
                    📄+
                  </button>
                  <button
                    onClick={handleNewFolder}
                    className="w-5 h-5 flex items-center justify-center hover:bg-white/60 rounded text-[#4a5866] text-[11px] leading-none"
                    title="New Folder"
                  >
                    📁+
                  </button>
                </div>
              )}
            </div>
            
            {/* File Tree */}
            <div className="flex-1 overflow-y-auto" style={{ fontSize: '13px' }}>
              {selectedProject ? (
                <div className="py-1">
                  {/* Render File Tree */}
                  {(() => {
                    const tree = buildFileTree(selectedProject.files)
                    const renderTreeNode = (node: FileTreeNode, depth: number = 0): JSX.Element => {
                      const isExpanded = expandedFolders.has(node.path)
                      const isActive = selectedFile === node.path && node.type === 'file'
                      
                      return (
                        <div key={node.path}>
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-white/40 ${
                              isActive ? 'bg-[#4e8dec]/20' : ''
                            }`}
                            style={{ paddingLeft: `${8 + depth * 16}px` }}
                            onClick={() => {
                              if (node.type === 'folder') {
                                toggleFolder(node.path)
                              } else {
                                handleFileSelect(node.path)
                              }
                            }}
                          >
                            {node.type === 'folder' ? (
                              <>
                                <span className="text-[10px] w-3 text-center text-[#6b728a]">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span className="text-xs">📁</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] w-3"></span>
                                <span className="text-xs">
                                  {node.file?.type === 'html'
                                    ? '📄'
                                    : node.file?.type === 'css'
                                    ? '🎨'
                                    : node.file?.type === 'javascript'
                                    ? '📜'
                                    : node.file?.type === 'typescript'
                                    ? '📘'
                                    : node.file?.type === 'python'
                                    ? '🐍'
                                    : '📄'}
                                </span>
                              </>
                            )}
                            <span className={`flex-1 truncate text-[13px] ${isActive ? 'text-[#4e8dec] font-medium' : 'text-[#3a4455]'}`}>
                              {node.name}
                            </span>
                            {node.type === 'file' && node.file?.content && node.file?.edited && (
                              <span className="text-[8px] text-[#4e8dec]">●</span>
                            )}
                          </div>
                          {node.type === 'folder' && isExpanded && node.children && node.children.length > 0 && (
                            <div>
                              {node.children.map((child) => renderTreeNode(child, depth + 1))}
                            </div>
                          )}
                        </div>
                      )
                    }
                    
                    return tree.map((node) => renderTreeNode(node))
                  })()}
                  
                  {/* Live Preview Option */}
                  <div
                    className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/40 ${
                      selectedFile === null ? 'bg-[#4e8dec]/20' : ''
                    }`}
                    onClick={() => setSelectedFile(null)}
                  >
                    <span className="text-xs w-3"></span>
                    <span className="text-xs">▶️</span>
                    <span className={`flex-1 ${selectedFile === null ? 'text-[#4e8dec] font-medium' : 'text-[#3a4455]'}`}>
                      Live Preview
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-[#7a859b] py-12 text-sm">
                  No project yet
                </div>
              )}
            </div>
          </div>

          {/* Preview/Editor */}
          <div className="flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, #fefefe 0%, #f2f4fb 100%)' }}>
            <div
              className="px-5 py-3 border-b flex items-center gap-3 text-sm"
              style={{
                borderColor: 'rgba(200,205,220,0.8)',
                background: 'linear-gradient(180deg, #fefefe 0%, #e8ebf7 100%)',
                color: '#3a4455',
              }}
            >
              <span className="font-semibold">{selectedFile || 'Preview Surface'}</span>
              {!selectedFile && (
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#8791a8]">
                  Live render
                </span>
              )}
              {selectedProject && (
                <span className="ml-auto text-[11px] text-[#8791a8]">
                  {activeProfile.language?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              {selectedFile ? (
                <textarea
                  value={currentFileContent}
                  onChange={(e) => handleFileEdit(e.target.value)}
                  className="flex-1 w-full h-full p-4 bg-[#f6f8ff] text-[#1f2330] font-mono text-sm resize-none focus:outline-none border-0"
                  spellCheck={false}
                  placeholder="// Start typing..."
                  style={{
                    boxShadow: 'inset 0 1px 6px rgba(0,0,0,0.08)',
                  }}
                />
              ) : hasHtmlPreview ? (
                <iframe
                  key={selectedProject?.id}
                  className="flex-1 border-0 w-full h-full"
                  title="Preview"
                  sandbox="allow-scripts allow-forms allow-modals"
                  srcDoc={previewSrcdoc}
                  style={{ background: 'white' }}
                />
              ) : (
                renderInstructionsPanel()
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div
            className="w-80 border-l flex flex-col"
            style={{
              background: panelBackground,
              borderColor: 'rgba(140,150,175,0.4)',
            }}
          >
            <div
              className="px-4 py-3 border-b"
              style={{
                borderColor: 'rgba(140,150,175,0.4)',
              }}
            >
              <p className="text-xs font-bold tracking-[0.25em] text-[#4a5866]">CONSOLE</p>
              <p className="text-[11px] text-[#7b8195]">Describe what you want to build</p>
            </div>

            {apiKeyStatus && (
              <div
                className={`mx-4 mt-3 mb-1 rounded-xl border px-3 py-2 text-[11px] ${
                  apiKeyStatus.error || !apiKeyStatus.hasKey
                    ? 'bg-[#fff4d7] border-[#ffe0a6] text-[#8a5a00]'
                    : 'bg-[#e6f4ff] border-[#c2e0ff] text-[#24527a]'
                }`}
              >
                {apiKeyStatus.error
                  ? apiKeyStatus.error
                  : apiKeyStatus.hasKey
                  ? `${formatProviderName(apiKeyStatus.provider)} key loaded for this session.`
                  : `No saved ${formatProviderName(
                      apiKeyStatus.provider
                    )} key detected. Add one in System Preferences to use your own quota.`}
              </div>
            )}

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center text-[#7a859b] py-10 text-sm">
                  Plan, research, ideate
                </div>
              )}

              {chatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {editingMessageId === message.id ? (
                    <div className="max-w-[90%] w-full rounded-xl border border-[#4e8dec] bg-white shadow-lg p-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            submitEditedMessage()
                          } else if (e.key === 'Escape') {
                            cancelEditing()
                          }
                        }}
                        className="w-full bg-[#f4f6ff] text-[#1b1b1b] px-3 py-2 text-sm rounded border border-[#c4cae0] focus:outline-none focus:border-[#4e8dec]"
                        placeholder="Edit your message..."
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={submitEditedMessage}
                          className="flex-1 px-3 py-1.5 rounded text-sm font-semibold text-white"
                          style={{ background: 'linear-gradient(180deg, #4e8dec 0%, #316fce 100%)' }}
                        >
                          Submit
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 bg-[#e0e4f2] text-[#4a5866] rounded text-sm font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => message.sender === 'user' && startEditingMessage(message)}
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-b from-[#4e8dec] to-[#316fce] text-white cursor-pointer'
                          : message.sender === 'system'
                          ? 'bg-white border border-[#d6d9ea] text-[#1f2330]'
                          : 'bg-white text-[#1f2330]'
                      }`}
                    >
                      {message.image && (
                        <img src={message.image} alt="Uploaded" className="max-w-full mb-2 rounded" />
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                      {message.editedFiles && message.editedFiles.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/30 text-[11px]">
                          {message.editedFiles.map((file) => (
                            <div key={file} className="text-white/90 flex items-center gap-1">
                              <span>✓</span> {file}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Current thought animation */}
              <AnimatePresence>
                {currentThought && (
                  <motion.div
                    key={currentThought.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div
                      className="max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow border border-[#d9def0]"
                      style={{
                        background:
                          currentThought.action === 'done'
                            ? 'linear-gradient(180deg, #d6f5df 0%, #c1f0ce 100%)'
                            : currentThought.action === 'editing'
                            ? 'linear-gradient(180deg, #fff2d9 0%, #ffe6b3 100%)'
                            : 'linear-gradient(180deg, #eef2ff 0%, #dde6ff 100%)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {currentThought.action === 'thinking' && <span className="animate-spin">⏳</span>}
                        {currentThought.action === 'editing' && <span className="animate-pulse">✏️</span>}
                        {currentThought.action === 'done' && <span>✓</span>}
                        <span className="text-[#2b2f3a]">{currentThought.thought}</span>
                      </div>
                      {currentThought.file && (
                        <div className="mt-1 text-[11px] text-[#5a6275]">
                          → {currentThought.file}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isGenerating && !currentThought && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 border border-[#d6d9ea]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#4e8dec] rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-[#4e8dec] rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <span
                        className="w-2 h-2 bg-[#4e8dec] rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div
              className="border-t p-4 space-y-3"
              style={{
                borderColor: 'rgba(140,150,175,0.3)',
                background: 'linear-gradient(180deg, #f6f8ff 0%, #e6ecff 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={mode === 'agent' ? 'Describe the next feature…' : 'Ask a question...'}
                  className="flex-1 px-3 py-2 bg-white rounded-lg text-sm placeholder-[#9aa3bb] focus:outline-none border border-[#c4cae0] focus:border-[#4e8dec]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isGenerating || (!chatInput.trim() && !uploadedImage)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(180deg, #4e8dec 0%, #316fce 100%)',
                    boxShadow: '0 4px 10px rgba(49,111,206,0.35)',
                  }}
                >
                  {isGenerating ? 'Thinking…' : 'Send'}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#5c667c]">
                <div className="flex items-center gap-1 bg-white/70 rounded-lg px-2 py-1 border border-[#c4cae0]">
                  <span className="text-xs">∞</span>
                  <select
                    value={mode}
                    onChange={(e) => {
                      const newMode = e.target.value as Mode
                      setMode(newMode)
                      setModel(newMode === 'agent' ? DEFAULT_AGENT_MODEL : DEFAULT_ASK_MODEL)
                    }}
                    className="bg-transparent text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="agent">Agent</option>
                    <option value="ask">Ask</option>
                  </select>
                </div>

                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-white/80 text-xs px-2 py-1 rounded-lg border border-[#c4cae0] focus:outline-none cursor-pointer flex-1"
                >
                  <optgroup label="Claude">
                    {CLAUDE_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {formatModelName(m)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Gemini">
                    {GEMINI_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {formatModelName(m)}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 rounded-lg border border-[#c4cae0] bg-white/80 hover:bg-white"
                    title="Upload image"
                  >
                    📎
                  </button>
                  {uploadedImage && (
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="px-2 py-1 rounded-lg bg-[#ffe2e2] text-[#c44545] border border-[#f5b0b0]"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    className="px-2 py-1 rounded-lg border border-[#c4cae0] bg-white/80"
                    title="Voice input (coming soon)"
                  >
                    🎤
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal Panel */}
        {showTerminal && (
          <div
            className="border-t flex flex-col"
            style={{
              height: '300px',
              borderColor: 'rgba(140,150,175,0.4)',
              background: 'linear-gradient(180deg, #1e1e1e 0%, #252525 100%)',
            }}
          >
            <div
              className="px-4 py-2 border-b flex items-center justify-between"
              style={{
                borderColor: 'rgba(140,150,175,0.3)',
                background: 'linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold tracking-[0.2em] text-[#8a94a6]">TERMINAL</span>
                {activeTerminalId && (
                  <span className="text-[10px] text-[#4e8dec] animate-pulse">Running...</span>
                )}
                {selectedProject && selectedProject.id !== 'welcome' && (
                  <div className="flex items-center gap-1">
                    {selectedProject.installCommand && selectedProject.installCommand !== 'none' && (
                      <button
                        onClick={() => {
                          if (terminalInstanceRef.current && !activeTerminalId) {
                            terminalInstanceRef.current.write(`\r\n\x1b[33m$ ${selectedProject.installCommand}\x1b[0m\r\n`)
                            runTerminalCommand(selectedProject.installCommand || '')
                          }
                        }}
                        className="px-2 py-0.5 text-[10px] rounded border border-[#4e8dec] bg-[#4e8dec]/20 text-[#4e8dec] hover:bg-[#4e8dec]/30 disabled:opacity-40"
                        disabled={!!activeTerminalId}
                      >
                        Install
                      </button>
                    )}
                    {selectedProject.buildCommand && selectedProject.buildCommand !== 'none' && (
                      <button
                        onClick={() => {
                          if (terminalInstanceRef.current && !activeTerminalId) {
                            terminalInstanceRef.current.write(`\r\n\x1b[33m$ ${selectedProject.buildCommand}\x1b[0m\r\n`)
                            runTerminalCommand(selectedProject.buildCommand || '')
                          }
                        }}
                        className="px-2 py-0.5 text-[10px] rounded border border-[#4e8dec] bg-[#4e8dec]/20 text-[#4e8dec] hover:bg-[#4e8dec]/30 disabled:opacity-40"
                        disabled={!!activeTerminalId}
                      >
                        Build
                      </button>
                    )}
                    {selectedProject.startCommand && selectedProject.startCommand !== 'none' && (
                      <button
                        onClick={() => {
                          if (terminalInstanceRef.current && !activeTerminalId) {
                            terminalInstanceRef.current.write(`\r\n\x1b[33m$ ${selectedProject.startCommand}\x1b[0m\r\n`)
                            runTerminalCommand(selectedProject.startCommand || '')
                          }
                        }}
                        className="px-2 py-0.5 text-[10px] rounded border border-[#0dbc79] bg-[#0dbc79]/20 text-[#0dbc79] hover:bg-[#0dbc79]/30 disabled:opacity-40"
                        disabled={!!activeTerminalId}
                      >
                        Start
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeTerminalId && (
                  <button
                    onClick={stopTerminalCommand}
                    className="px-2 py-1 text-[10px] rounded border border-[#c44545] bg-[#ffe2e2] text-[#c44545] hover:bg-[#ffcccc]"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={() => setShowTerminal(false)}
                  className="px-2 py-1 text-[10px] rounded border border-[#c4cae0] bg-white/20 text-[#8a94a6] hover:bg-white/30"
                >
                  Hide
                </button>
              </div>
            </div>
            <div ref={terminalRef} className="flex-1 overflow-hidden" style={{ padding: '8px' }} />
          </div>
        )}

        {/* Terminal Toggle Button */}
        {!showTerminal && (
          <div
            className="border-t px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10"
            onClick={() => setShowTerminal(true)}
            style={{
              borderColor: 'rgba(140,150,175,0.3)',
              background: 'linear-gradient(180deg, #f6f8ff 0%, #e6ecff 100%)',
            }}
          >
            <span className="text-xs font-semibold text-[#4a5866]">Terminal</span>
            <span className="text-xs text-[#8a94a6]">Click to open</span>
          </div>
        )}
      </div>
  )
}
