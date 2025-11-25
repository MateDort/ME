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
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: #00ff00;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 800px;
      background: rgba(0, 20, 0, 0.8);
      padding: 60px 40px;
      border: 3px solid #00ff00;
      box-shadow: 0 0 30px rgba(0, 255, 0, 0.3), inset 0 0 30px rgba(0, 255, 0, 0.1);
      border-radius: 10px;
    }
    h1 {
      font-size: 3.5rem;
      margin-bottom: 30px;
      text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00;
      animation: glow 2s ease-in-out infinite alternate;
    }
    @keyframes glow {
      from { text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00; }
      to { text-shadow: 0 0 30px #00ff00, 0 0 60px #00ff00, 0 0 80px #00ff00; }
    }
    p {
      font-size: 1.3rem;
      line-height: 2;
      margin-bottom: 20px;
      opacity: 0.9;
    }
    .instructions {
      margin-top: 40px;
      padding: 20px;
      border: 1px solid #00ff00;
      border-radius: 5px;
      text-align: left;
      background: rgba(0, 255, 0, 0.05);
    }
    .instructions h2 {
      font-size: 1.2rem;
      margin-bottom: 15px;
      color: #00ff00;
    }
    .instructions li {
      margin-bottom: 10px;
      padding-left: 20px;
      position: relative;
    }
    .instructions li::before {
      content: '>';
      position: absolute;
      left: 0;
      color: #00ff00;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>💡 BRAINSTORM</h1>
    <p>Your AI-Powered Development Environment</p>
    <p>1970s Terminal Aesthetic • Modern AI Power</p>
    <div class="instructions">
      <h2>HOW TO USE:</h2>
      <ul>
        <li>Type what you want to build in the chat (e.g. "Build a snake game")</li>
        <li>Watch the AI think and create files in real-time</li>
        <li>Edit files by clicking on them in the left panel</li>
        <li>Ask questions in ASK mode or build things in AGENT mode</li>
        <li>Switch between models using the dropdown</li>
      </ul>
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

    // Find the message index
    const messageIndex = chatMessages.findIndex(m => m.id === editingMessageId)
    if (messageIndex === -1) return

    // Get the original message to preserve image if any
    const originalMessage = chatMessages[messageIndex]

    // Remove all messages after this one (including this one)
    const messagesBeforeEdit = chatMessages.slice(0, messageIndex)
    setChatMessages(messagesBeforeEdit)

    // Reset editing state
    setEditingMessageId(null)
    setEditingText('')

    // Set the input to the edited text and submit
    setChatInput(editingText)
    if (originalMessage.image) {
      setUploadedImage(originalMessage.image)
    }

    // Small delay to let state update, then trigger send
    setTimeout(() => {
      handleSendMessageWithText(editingText, originalMessage.image)
    }, 50)
  }

  // Helper to send message with specific text
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
    // Check if this is an edit request for existing project
    const isEditRequest = selectedProject && selectedProject.id !== 'welcome' && 
      (prompt.toLowerCase().includes('change') || 
       prompt.toLowerCase().includes('edit') || 
       prompt.toLowerCase().includes('update') ||
       prompt.toLowerCase().includes('modify') ||
       prompt.toLowerCase().includes('make the') ||
       prompt.toLowerCase().includes('replace'))

    if (isEditRequest && selectedProject) {
      // Edit existing files
      await handleEditFiles(prompt, image)
    } else if (!selectedProject || selectedProject.id === 'welcome') {
      // Create new project
      await handleCreateProject(prompt)
    } else {
      // Add to existing project or create new file
      await handleEditFiles(prompt, image)
    }
  }

  const handleCreateProject = async (prompt: string) => {
    showThought(`Analyzing your request... (using ${formatModelName(model)})`, undefined, 'thinking')
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

      // Remove welcome project if it exists
      setProjects((prev) => prev.filter(p => p.id !== 'welcome').concat(newProject))
      setSelectedProject(newProject)

      // Show project created message
      const planMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: `📋 Creating: ${newProject.name}\nModel: ${formatModelName(model)}\n\nFiles to generate:\n${newProject.files.map(f => `• ${f.path}`).join('\n')}`,
        sender: 'system',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, planMessage])

      // Generate each file
      const editedFiles: string[] = []
      for (let i = 0; i < newProject.files.length; i++) {
        const file = newProject.files[i]
        const todo = newProject.todos[i] || { task: `Create ${file.path}` }

        showThought(`I need to create ${file.path}...`, file.path, 'thinking')
        await new Promise(r => setTimeout(r, 800))

        showThought(`Writing ${file.type} code for ${file.path}... (${formatModelName(model)})`, file.path, 'editing')

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

          // Update project with new file content
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

      // Show completion message
      clearThought()
      const doneMessage: ChatMessage = {
        id: `done-${Date.now()}`,
        text: `✅ Project complete! (${formatModelName(model)})\n\nFiles created:`,
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

    showThought(`Reading your files... (using ${formatModelName(model)})`, undefined, 'thinking')
    await new Promise(r => setTimeout(r, 500))

    showThought('Planning what changes to make...', undefined, 'thinking')
    await new Promise(r => setTimeout(r, 500))

    const imageData = image ? await convertImageToBase64(image) : null

    // Determine which files need to be edited
    const filesToEdit = selectedFile 
      ? [selectedProject.files.find(f => f.path === selectedFile)!]
      : selectedProject.files.filter(f => f.content)

    const editedFiles: string[] = []

    for (const file of filesToEdit) {
      showThought(`I need to edit ${file.path} to ${prompt.substring(0, 50)}...`, file.path, 'thinking')
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
          // Update file content
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

    // Show completion
    clearThought()
    if (editedFiles.length > 0) {
      const doneMessage: ChatMessage = {
        id: `done-${Date.now()}`,
        text: `✅ Changes complete! (${formatModelName(model)})`,
        sender: 'agent',
        timestamp: new Date(),
        editedFiles,
      }
      setChatMessages((prev) => [...prev, doneMessage])
      setEditedFilesThisSession(editedFiles)
    } else {
      const noEditMessage: ChatMessage = {
        id: `noedit-${Date.now()}`,
        text: `Could not make the requested changes with ${formatModelName(model)}. Please try rephrasing or try a different model.`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, noEditMessage])
    }
  }

  const handleAskMode = async (prompt: string, image?: string) => {
    showThought(`Reading your files... (${formatModelName(model)})`, undefined, 'thinking')
    await new Promise(r => setTimeout(r, 300))

    showThought('Thinking about your question...', undefined, 'thinking')

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

  // Compute preview HTML using useMemo to avoid cross-origin issues
  const previewSrcdoc = useMemo(() => {
    if (!selectedProject) return '<html><body style="background:#000;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><p>No preview available</p></body></html>'

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

    // Add navigation blocking script to prevent iframe from loading parent
    const navigationBlocker = `
      <script>
        // Block all navigation attempts
        document.addEventListener('click', function(e) {
          var target = e.target;
          while (target && target.tagName !== 'A') {
            target = target.parentElement;
          }
          if (target && target.tagName === 'A' && target.href) {
            e.preventDefault();
            console.log('Navigation blocked:', target.href);
          }
        }, true);
        
        // Prevent form submissions from navigating
        document.addEventListener('submit', function(e) {
          if (!e.defaultPrevented) {
            e.preventDefault();
            console.log('Form submission - handle with JavaScript');
          }
        }, true);
      </script>
    `;

    // Inject navigation blocker before </body> or at the end
    let safeHTML = finalHTML
    if (safeHTML.includes('</body>')) {
      safeHTML = safeHTML.replace('</body>', navigationBlocker + '</body>')
    } else if (safeHTML.includes('</html>')) {
      safeHTML = safeHTML.replace('</html>', navigationBlocker + '</html>')
    } else if (safeHTML) {
      safeHTML = safeHTML + navigationBlocker
    }

    return safeHTML || '<html><body style="background:#000;color:#0f0;font-family:monospace;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><p>No preview available</p></body></html>'
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

  // Format model name for display
  const formatModelName = (m: string) => {
    if (m.includes('claude')) {
      return m.replace('claude-3-', '').replace('claude-3.5-', '3.5-').replace('-20240307', '').replace('-20240229', '').replace('-20241022', '')
    }
    return m.replace('gemini-', '').replace('1.5-', '1.5 ').replace('-latest', ' ✓')
  }

  return (
    <div className="h-full flex bg-black text-green-400" style={{ fontFamily: 'monospace' }}>
      {/* Left: Files Panel */}
      <div className="w-56 bg-black border-r-2 border-green-600 flex flex-col">
        <div className="bg-green-600 text-black px-3 py-2 border-b-2 border-green-800">
          <h2 className="font-bold text-sm">FILES</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {selectedProject ? (
            <div className="space-y-1">
              <div className="text-xs text-green-300 mb-2 px-1 font-bold">
                {selectedProject.name.toUpperCase()}
              </div>
              {selectedProject.files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(file.path)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs border ${
                    selectedFile === file.path
                      ? 'bg-green-900/60 text-green-300 border-green-500'
                      : 'bg-gray-900/20 text-gray-400 border-gray-700 hover:bg-gray-800/40 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{file.path}</span>
                    <span className="flex-shrink-0">
                      {file.content && file.edited && (
                        <span className="text-green-400">✓</span>
                      )}
                      {file.content && !file.edited && (
                        <span className="text-gray-500">•</span>
                      )}
                    </span>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setSelectedFile(null)}
                className={`w-full text-center px-2 py-1.5 mt-2 rounded text-xs border ${
                  selectedFile === null
                    ? 'bg-green-900/60 text-green-300 border-green-500'
                    : 'bg-gray-900/20 text-gray-400 border-gray-700 hover:bg-gray-800/40 hover:border-gray-600'
                }`}
              >
                [PREVIEW]
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-600 py-8 text-xs">
              NO PROJECT
            </div>
          )}
        </div>
      </div>

      {/* Middle: Preview/Editor */}
      <div className="flex-1 flex flex-col bg-black">
        <div className="bg-green-600 text-black px-3 py-2 border-b-2 border-green-800 flex items-center justify-between">
          <h3 className="font-bold text-sm">
            {selectedFile ? selectedFile.toUpperCase() : 'PREVIEW'}
          </h3>
        </div>
        {selectedFile ? (
          <textarea
            value={currentFileContent}
            onChange={(e) => handleFileEdit(e.target.value)}
            className="flex-1 w-full p-4 bg-black text-green-400 font-mono text-sm resize-none focus:outline-none border-0"
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
      <div className="w-80 bg-black border-l-2 border-green-600 flex flex-col">
        <div className="bg-green-600 text-black px-3 py-2 border-b-2 border-green-800">
          <h2 className="font-bold text-sm">CHAT</h2>
        </div>

        {/* Controls */}
        <div className="p-2 border-b border-green-800 space-y-2 bg-green-900/10">
          <div className="flex gap-2">
            <select
              value={mode}
              onChange={(e) => {
                const newMode = e.target.value as Mode
                setMode(newMode)
                setModel(newMode === 'agent' ? DEFAULT_AGENT_MODEL : DEFAULT_ASK_MODEL)
              }}
              className="flex-1 px-2 py-1 bg-black text-green-400 border border-green-600 rounded text-xs font-bold"
            >
              <option value="agent">AGENT</option>
              <option value="ask">ASK</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 px-2 py-1 bg-black text-green-400 border border-green-600 rounded text-xs font-bold"
            >
              <optgroup label="Claude">
                {CLAUDE_MODELS.map((m) => (
                  <option key={m} value={m}>{formatModelName(m)}</option>
                ))}
              </optgroup>
              <optgroup label="Gemini">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m}>{formatModelName(m)}</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-2 py-1 bg-black text-green-400 border border-green-600 rounded text-xs font-bold hover:bg-green-900/20"
            >
              {uploadedImage ? '📎 IMG' : '📎 UPLOAD'}
            </button>
            {uploadedImage && (
              <button
                onClick={() => setUploadedImage(null)}
                className="px-2 py-1 bg-red-900/40 text-red-400 border border-red-600 rounded text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-2 space-y-2">
          {chatMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Editing mode for user messages */}
              {editingMessageId === message.id ? (
                <div className="max-w-[90%] w-full rounded border-2 border-green-400 bg-green-900/60 p-2">
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
                    className="w-full bg-black text-green-300 px-2 py-1 text-xs rounded border border-green-600 focus:outline-none focus:border-green-400"
                    placeholder="Edit your message..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={submitEditedMessage}
                      className="flex-1 px-2 py-1 bg-green-600 text-black rounded text-xs font-bold hover:bg-green-500"
                    >
                      ↵ Submit
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs mt-1 text-gray-500">Press Enter to submit, Esc to cancel</p>
                </div>
              ) : (
                <div
                  onClick={() => message.sender === 'user' && startEditingMessage(message)}
                  className={`max-w-[90%] rounded border p-2 text-xs ${
                    message.sender === 'user'
                      ? 'bg-green-900/40 text-green-300 border-green-500 cursor-pointer hover:border-green-400 hover:bg-green-900/60 transition-colors'
                      : message.sender === 'system'
                      ? 'bg-blue-900/20 text-blue-300 border-blue-600'
                      : 'bg-gray-900/40 text-gray-300 border-gray-600'
                  }`}
                  title={message.sender === 'user' ? 'Click to edit and resubmit' : undefined}
                >
                  {message.image && (
                    <img src={message.image} alt="Uploaded" className="max-w-full mb-2 rounded border border-green-600" />
                  )}

                  <p className="whitespace-pre-wrap">{message.text}</p>

                  {/* Show edited files */}
                  {message.editedFiles && message.editedFiles.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      {message.editedFiles.map((file) => (
                        <div key={file} className="text-green-400 font-mono flex items-center gap-1">
                          <span className="text-green-500">✓</span> {file}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs opacity-50">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    {message.sender === 'user' && !isGenerating && (
                      <span className="text-xs text-green-600 opacity-50">✎ click to edit</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Current thought animation */}
          <AnimatePresence>
            {currentThought && (
              <motion.div
                key={currentThought.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-start"
              >
                <div className={`max-w-[90%] rounded border p-2 text-xs ${
                  currentThought.action === 'done'
                    ? 'bg-green-900/30 text-green-400 border-green-600'
                    : currentThought.action === 'editing'
                    ? 'bg-yellow-900/30 text-yellow-400 border-yellow-600'
                    : 'bg-blue-900/20 text-blue-300 border-blue-600'
                }`}>
                  <div className="flex items-center gap-2">
                    {currentThought.action === 'thinking' && (
                      <span className="animate-spin">⟳</span>
                    )}
                    {currentThought.action === 'editing' && (
                      <span className="animate-pulse">✎</span>
                    )}
                    {currentThought.action === 'done' && (
                      <span>✓</span>
                    )}
                    <span>{currentThought.thought}</span>
                  </div>
                  {currentThought.file && (
                    <div className="mt-1 font-mono text-xs opacity-70">
                      → {currentThought.file}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isGenerating && !currentThought && (
            <div className="flex justify-start">
              <div className="bg-gray-900/40 text-gray-300 border border-gray-600 rounded p-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-green-800 p-2 bg-green-900/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={mode === 'agent' ? 'Build something...' : 'Ask a question...'}
              className="flex-1 px-2 py-1.5 bg-black text-green-400 border border-green-600 rounded text-xs placeholder-gray-600 focus:outline-none focus:border-green-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={isGenerating || (!chatInput.trim() && !uploadedImage)}
              className="px-3 py-1 bg-green-600 text-black rounded font-bold hover:bg-green-500 disabled:opacity-50 text-xs"
            >
              {isGenerating ? '⟳' : '→'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
