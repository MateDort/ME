'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CLAUDE_MODELS, GEMINI_MODELS, DEFAULT_AGENT_MODEL, DEFAULT_ASK_MODEL } from '@/lib/models'

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
  description: string
  todos: Todo[]
  files: ProjectFile[]
  createdAt: Date
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

export default function BrainstormApp() {
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages, currentThought])

  // Load saved projects from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('brainstorm_projects')
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects)
        const projectsWithDates = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
        }))
        setProjects(projectsWithDates)
        if (projectsWithDates.length > 0) {
          setSelectedProject(projectsWithDates[0])
        }
      } catch (e) {
        console.error('Error loading saved projects:', e)
      }
    }
  }, [])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('brainstorm_projects', JSON.stringify(projects))
    }
  }, [projects])

  // Default welcome project
  useEffect(() => {
    if (projects.length === 0 && !selectedProject) {
      const welcomeProject: Project = {
        id: 'welcome',
        name: 'Welcome',
        type: 'web',
        language: 'html',
        description: 'Welcome to Brainstorm',
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
  <title>Welcome to Brainstorm</title>
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
    <h1>💡 Brainstorm</h1>
    <p>Your AI-powered development environment. Build anything with natural language.</p>
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
    
    const response = await fetch('/api/generate-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    })

    const data = await response.json()
    if (data.plan) {
      const newProject: Project = {
        id: Date.now().toString(),
        name: data.plan.name || 'New Project',
        type: data.plan.type || 'web',
        language: data.plan.language || 'html',
        description: prompt,
        todos: data.plan.todos || [],
        files: data.plan.files.map((f: any) => ({
          ...f,
          content: '',
          edited: false,
        })),
        createdAt: new Date(),
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
      return m.replace('claude-3-', '').replace('claude-3.5-', '3.5-').replace('-20240307', '').replace('-20240229', '').replace('-20241022', '')
    }
    return m.replace('gemini-', '').replace('1.5-', '1.5 ').replace('-latest', '')
  }

  return (
    <div className="h-full flex bg-[#1e1e1e] text-gray-200" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left: Files Panel */}
      <div className="w-52 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
        <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-medium border-b border-[#3c3c3c]">
          Files
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {selectedProject ? (
            <div className="space-y-0.5">
              <div className="text-xs text-gray-500 mb-2 px-2 font-medium">
                {selectedProject.name}
              </div>
              {selectedProject.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file.path)}
                  className={`w-full text-left px-2 py-1 rounded text-sm flex items-center gap-2 ${
                    selectedFile === file.path
                      ? 'bg-[#37373d] text-white'
                      : 'text-gray-400 hover:bg-[#2a2d2e]'
                  }`}
                >
                  <span className="text-xs opacity-60">
                    {file.type === 'html' ? '📄' : file.type === 'css' ? '🎨' : file.type === 'javascript' ? '📜' : '📁'}
                  </span>
                  <span className="truncate flex-1">{file.path}</span>
                  {file.content && file.edited && (
                    <span className="text-green-400 text-xs">✓</span>
                  )}
                </button>
              ))}
              <button
                onClick={() => setSelectedFile(null)}
                className={`w-full text-left px-2 py-1 mt-2 rounded text-sm flex items-center gap-2 ${
                  selectedFile === null
                    ? 'bg-[#37373d] text-white'
                    : 'text-gray-400 hover:bg-[#2a2d2e]'
                }`}
              >
                <span className="text-xs">▶️</span>
                <span>Preview</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8 text-sm">
              No project
            </div>
          )}
        </div>
      </div>

      {/* Middle: Preview/Editor */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        <div className="bg-[#2d2d2d] px-4 py-1.5 border-b border-[#3c3c3c] flex items-center gap-2">
          <span className="text-sm text-gray-300">
            {selectedFile || 'Preview'}
          </span>
          {!selectedFile && (
            <span className="text-xs text-gray-500 bg-[#3c3c3c] px-2 py-0.5 rounded">Live</span>
          )}
        </div>
        {selectedFile ? (
          <textarea
            value={currentFileContent}
            onChange={(e) => handleFileEdit(e.target.value)}
            className="flex-1 w-full p-4 bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none focus:outline-none border-0"
            spellCheck={false}
            placeholder="// Start typing..."
          />
        ) : (
          <iframe
            key={selectedProject?.id}
            className="flex-1 border-0 bg-white"
            title="Preview"
            sandbox="allow-scripts allow-forms allow-modals"
            srcDoc={previewSrcdoc}
          />
        )}
      </div>

      {/* Right: Chat Panel */}
      <div className="w-80 bg-[#252526] border-l border-[#3c3c3c] flex flex-col">
        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm mb-2">Plan, research, ideate</p>
              <p className="text-xs">Describe what you want to build</p>
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
                <div className="max-w-[90%] w-full rounded-lg border border-blue-500 bg-[#2d2d2d] p-2">
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
                    className="w-full bg-[#1e1e1e] text-gray-200 px-3 py-2 text-sm rounded border border-[#3c3c3c] focus:outline-none focus:border-blue-500"
                    placeholder="Edit your message..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={submitEditedMessage}
                      className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-500"
                    >
                      Submit
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 bg-[#3c3c3c] text-gray-300 rounded text-sm hover:bg-[#4c4c4c]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => message.sender === 'user' && startEditingMessage(message)}
                  className={`max-w-[90%] rounded-lg p-3 text-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-500'
                      : message.sender === 'system'
                      ? 'bg-[#2d2d2d] text-gray-300 border border-[#3c3c3c]'
                      : 'bg-[#2d2d2d] text-gray-200'
                  }`}
                >
                  {message.image && (
                    <img src={message.image} alt="Uploaded" className="max-w-full mb-2 rounded" />
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.editedFiles && message.editedFiles.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#3c3c3c]">
                      {message.editedFiles.map((file) => (
                        <div key={file} className="text-green-400 text-xs flex items-center gap-1">
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
                <div className={`max-w-[90%] rounded-lg p-3 text-sm ${
                  currentThought.action === 'done'
                    ? 'bg-green-900/30 text-green-400'
                    : currentThought.action === 'editing'
                    ? 'bg-yellow-900/30 text-yellow-400'
                    : 'bg-[#2d2d2d] text-gray-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentThought.action === 'thinking' && (
                      <span className="animate-spin">⏳</span>
                    )}
                    {currentThought.action === 'editing' && (
                      <span className="animate-pulse">✏️</span>
                    )}
                    {currentThought.action === 'done' && (
                      <span>✓</span>
                    )}
                    <span>{currentThought.thought}</span>
                  </div>
                  {currentThought.file && (
                    <div className="mt-1 text-xs opacity-70">
                      → {currentThought.file}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isGenerating && !currentThought && (
            <div className="flex justify-start">
              <div className="bg-[#2d2d2d] rounded-lg p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Controls below textbox */}
        <div className="border-t border-[#3c3c3c] p-3 space-y-2">
          {/* Text input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={mode === 'agent' ? 'Plan, research, ideate' : 'Ask a question...'}
              className="flex-1 px-3 py-2 bg-[#3c3c3c] text-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || (!chatInput.trim() && !uploadedImage)}
              className="p-2 bg-transparent text-gray-400 rounded-lg hover:text-white disabled:opacity-30"
            >
              {isGenerating ? '⏳' : '→'}
            </button>
          </div>
          
          {/* Controls row - Mode, Model, Image */}
          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <div className="flex items-center gap-1 bg-[#3c3c3c] rounded-lg px-2 py-1">
              <span className="text-xs">∞</span>
              <select
                value={mode}
                onChange={(e) => {
                  const newMode = e.target.value as Mode
                  setMode(newMode)
                  setModel(newMode === 'agent' ? DEFAULT_AGENT_MODEL : DEFAULT_ASK_MODEL)
                }}
                className="bg-transparent text-sm text-gray-200 focus:outline-none cursor-pointer"
              >
                <option value="agent" className="bg-[#2d2d2d]">Agent</option>
                <option value="ask" className="bg-[#2d2d2d]">Ask</option>
              </select>
            </div>

            {/* Model selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-[#3c3c3c] text-sm text-gray-400 px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
            >
              <optgroup label="Claude">
                {CLAUDE_MODELS.map((m) => (
                  <option key={m} value={m} className="bg-[#2d2d2d]">{formatModelName(m)}</option>
                ))}
              </optgroup>
              <optgroup label="Gemini">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m} className="bg-[#2d2d2d]">{formatModelName(m)}</option>
                ))}
              </optgroup>
            </select>

            <div className="flex-1" />

            {/* Image upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-lg ${uploadedImage ? 'bg-blue-600 text-white' : 'bg-[#3c3c3c] text-gray-400 hover:text-white'}`}
              title="Upload image"
            >
              📎
            </button>
            {uploadedImage && (
              <button
                onClick={() => setUploadedImage(null)}
                className="p-1.5 bg-red-600/30 text-red-400 rounded-lg hover:bg-red-600/50"
              >
                ✕
              </button>
            )}
            
            {/* Mic button placeholder */}
            <button className="p-1.5 bg-[#3c3c3c] text-gray-400 rounded-lg hover:text-white" title="Voice input">
              🎤
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
