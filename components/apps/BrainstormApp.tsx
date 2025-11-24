'use client'

import { useState, useRef, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'

interface Note {
  id: string
  title: string
  content: string
  type: 'note' | 'code'
  language?: string
  createdAt: Date
}

interface ProjectFile {
  path: string
  type: string
  content: string
  description: string
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

interface ChatMessage {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
}

export default function BrainstormApp() {
  const [mode, setMode] = useState<'notes' | 'project'>('project')
  const [notes, setNotes] = useState<Note[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentTodoIndex, setCurrentTodoIndex] = useState(0)
  const previewRef = useRef<HTMLIFrameElement>(null)
  const generatingRef = useRef<{ projectId: string; fileIndex: number } | null>(null)

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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 800px;
      background: rgba(0, 0, 0, 0.3);
      padding: 60px 40px;
      border-radius: 20px;
      border: 3px solid #ffd700;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
    }
    h1 {
      font-size: 4rem;
      margin-bottom: 20px;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.5);
      color: #ffd700;
    }
    p {
      font-size: 1.5rem;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
      margin-top: 20px;
    }
    .pulse {
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="pulse">💡 Brainstorm</h1>
    <p>Welcome to Brainstorm</p>
    <p class="subtitle">It is here to make your ideas come alive</p>
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
      setSelectedFile('index.html')
    }
  }, [])

  const createNewNote = (type: 'note' | 'code' = 'note') => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: `New ${type === 'code' ? 'Code' : 'Note'}`,
      content: type === 'code' ? '// Start coding...' : '',
      type,
      language: type === 'code' ? 'html' : undefined,
      createdAt: new Date(),
    }
    setNotes([...notes, newNote])
  }

  const startProject = async () => {
    if (!chatInput.trim() || isGenerating) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      sender: 'user',
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setIsGenerating(true)

    try {
      // Generate project plan
      const response = await fetch('/api/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: chatInput }),
      })

      const data = await response.json()
      if (data.plan) {
        const newProject: Project = {
          id: Date.now().toString(),
          name: data.plan.name || 'New Project',
          type: data.plan.type || 'web',
          language: data.plan.language || 'html',
          description: chatInput,
          todos: data.plan.todos || [],
          files: data.plan.files.map((f: any) => ({
            ...f,
            content: '',
          })),
          createdAt: new Date(),
        }
        setProjects([...projects, newProject])
        setSelectedProject(newProject)
        setSelectedFile(newProject.files[0]?.path || null)
        setCurrentTodoIndex(0)

        const agentMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: `Got it! I'll build ${newProject.name} for you. Creating ${newProject.files.length} files...`,
          sender: 'agent',
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, agentMessage])

        // Start generating files
        setIsGenerating(true)
        generateNextFile(newProject.id, 0)
      }
    } catch (error) {
      console.error('Error starting project:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateNextFile = async (projectId: string, fileIndex: number) => {
    // Update ref to track current generation
    generatingRef.current = { projectId, fileIndex }

    // Get latest project state using functional update
    setProjects((prevProjects) => {
      const project = prevProjects.find((p) => p.id === projectId)
      
      if (!project) {
        setIsGenerating(false)
        generatingRef.current = null
        return prevProjects
      }

      // Check if we're done
      if (fileIndex >= project.files.length) {
        const doneMessage: ChatMessage = {
          id: `done-${Date.now()}`,
          text: 'All done! Your project is ready.',
          sender: 'agent',
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, doneMessage])
        setIsGenerating(false)
        generatingRef.current = null
        return prevProjects
      }

      const file = project.files[fileIndex]
      const todo = project.todos[fileIndex] || project.todos[0]

      // Mark todo as in progress
      const updatedTodos = project.todos.map((t, i) =>
        i === fileIndex ? { ...t, status: 'in_progress' as const } : t
      )
      const updatedProject = { ...project, todos: updatedTodos }
      setSelectedProject(updatedProject)

      const progressMessage: ChatMessage = {
        id: `progress-${fileIndex}-${Date.now()}`,
        text: `Creating ${file.path}...`,
        sender: 'agent',
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, progressMessage])

      // Generate file content
      fetch('/api/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: file.path,
          fileType: file.type,
          projectDescription: project.description,
          existingFiles: project.files
            .filter((f, i) => i < fileIndex && f.content)
            .map((f) => ({ path: f.path, content: f.content })),
          todo,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error || `HTTP ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          // Get latest project state again
          setProjects((latestProjects) => {
            const latestProject = latestProjects.find((p) => p.id === projectId)
            if (!latestProject) return latestProjects

            const fileContent = data.code || data.error 
              ? `// ${file.path} - ${data.error || 'Content will be generated here'}`
              : `// ${file.path} - Content will be generated here`
            const updatedFiles = latestProject.files.map((f, i) =>
              i === fileIndex ? { ...f, content: fileContent } : f
            )
            const completedTodos = latestProject.todos.map((t, i) =>
              i === fileIndex ? { ...t, status: 'completed' as const } : t
            )
            const finalProject = {
              ...latestProject,
              files: updatedFiles,
              todos: completedTodos,
            }
            setSelectedProject(finalProject)

            // Continue to next file with a longer delay to avoid rate limits
            setTimeout(() => {
              generateNextFile(projectId, fileIndex + 1)
            }, 1000) // Increased from 500ms to 1000ms

            return latestProjects.map((p) => (p.id === projectId ? finalProject : p))
          })
        })
        .catch((error) => {
          console.error('Error generating file:', error)
          // Continue even on error with placeholder
          setProjects((latestProjects) => {
            const latestProject = latestProjects.find((p) => p.id === projectId)
            if (!latestProject) return latestProjects

            const errorContent = `// Error generating ${file.path}: ${error.message || 'Unknown error'} - Will retry or continue`
            const updatedFiles = latestProject.files.map((f, i) =>
              i === fileIndex ? { ...f, content: errorContent } : f
            )
            const finalProject = {
              ...latestProject,
              files: updatedFiles,
            }
            setSelectedProject(finalProject)

            // Continue to next file even on error with longer delay
            setTimeout(() => {
              generateNextFile(projectId, fileIndex + 1)
            }, 2000) // Longer delay on error

            return latestProjects.map((p) => (p.id === projectId ? finalProject : p))
          })
        })

      return prevProjects.map((p) => (p.id === projectId ? updatedProject : p))
    })
  }

  const updateProjectFile = (projectId: string, filePath: string, content: string) => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    const updatedFiles = project.files.map((f) =>
      f.path === filePath ? { ...f, content } : f
    )
    const updatedProject = { ...project, files: updatedFiles }
    setProjects(projects.map((p) => (p.id === projectId ? updatedProject : p)))
    if (selectedProject?.id === projectId) {
      setSelectedProject(updatedProject)
    }
  }

  // Update preview when files change
  useEffect(() => {
    if (!selectedProject || !previewRef.current) return

    const iframe = previewRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const htmlFile = selectedProject.files.find((f) => f.type === 'html')
    const cssFile = selectedProject.files.find((f) => f.type === 'css')
    const jsFile = selectedProject.files.find((f) => f.type === 'javascript')
    const allFiles = selectedProject.files

    let finalHTML = ''

    if (htmlFile && htmlFile.content) {
      finalHTML = htmlFile.content

      if (cssFile && cssFile.content && !finalHTML.includes(cssFile.content.substring(0, 50))) {
        if (finalHTML.includes('</head>')) {
          finalHTML = finalHTML.replace('</head>', `<style>${cssFile.content}</style></head>`)
        } else if (finalHTML.includes('<body>')) {
          finalHTML = finalHTML.replace('<body>', `<head><style>${cssFile.content}</style></head><body>`)
        } else {
          finalHTML = `<head><style>${cssFile.content}</style></head>${finalHTML}`
        }
      }

      if (jsFile && jsFile.content && !finalHTML.includes(jsFile.content.substring(0, 50))) {
        if (finalHTML.includes('</body>')) {
          finalHTML = finalHTML.replace('</body>', `<script>${jsFile.content}</script></body>`)
        } else if (finalHTML.includes('</html>')) {
          finalHTML = finalHTML.replace('</html>', `<script>${jsFile.content}</script></html>`)
        } else {
          finalHTML = `${finalHTML}<script>${jsFile.content}</script>`
        }
      }
    } else {
      let htmlContent = ''
      let cssContent = ''
      let jsContent = ''

      allFiles.forEach((file) => {
        if (file.type === 'html' || file.path.endsWith('.html')) {
          htmlContent = file.content
        } else if (file.type === 'css' || file.path.endsWith('.css')) {
          cssContent = file.content
        } else if (file.type === 'javascript' || file.path.endsWith('.js')) {
          jsContent = file.content
        }
      })

      if (htmlContent) {
        finalHTML = htmlContent
        if (cssContent && !finalHTML.includes(cssContent.substring(0, 50))) {
          if (finalHTML.includes('</head>')) {
            finalHTML = finalHTML.replace('</head>', `<style>${cssContent}</style></head>`)
          } else {
            finalHTML = `<head><style>${cssContent}</style></head>${finalHTML}`
          }
        }
        if (jsContent && !finalHTML.includes(jsContent.substring(0, 50))) {
          if (finalHTML.includes('</body>')) {
            finalHTML = finalHTML.replace('</body>', `<script>${jsContent}</script></body>`)
          } else {
            finalHTML = `${finalHTML}<script>${jsContent}</script>`
          }
        }
      } else {
        finalHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedProject.name}</title>
  ${cssContent ? `<style>${cssContent}</style>` : ''}
</head>
<body>
  <div id="app"></div>
  ${jsContent ? `<script>${jsContent}</script>` : ''}
</body>
</html>`
      }
    }

    try {
      doc.open()
      doc.write(finalHTML || '<html><body><p>No content to display</p></body></html>')
      doc.close()
    } catch (error) {
      console.error('Error writing to iframe:', error)
    }
  }, [selectedProject?.files, selectedProject?.id])

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Left: Chat Panel */}
      <div className="w-80 bg-gray-800 border-r-2 border-gray-700 flex flex-col">
        <div className="bg-retro-orange text-black px-4 py-3 border-b-2 border-black">
          <h2 className="font-bold text-lg">💬 Chat</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-2 text-sm ${
                  message.sender === 'user'
                    ? 'bg-retro-blue text-white'
                    : 'bg-gray-700 text-gray-200 border border-gray-600'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-200 border border-gray-600 rounded-lg p-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <span
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t-2 border-gray-700 p-4 bg-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && startProject()}
              placeholder="Describe what you want to build..."
              className="flex-1 px-3 py-2 bg-gray-700 border-2 border-retro-yellow rounded text-white placeholder-gray-400 text-sm"
            />
            <button
              onClick={startProject}
              disabled={isGenerating || !chatInput.trim()}
              className="px-4 py-2 bg-retro-green text-black rounded font-bold hover:bg-retro-purple disabled:opacity-50 text-sm"
            >
              {isGenerating ? '⟳' : '→'}
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Preview */}
      <div className="flex-1 flex flex-col bg-white border-r-2 border-gray-700">
        <div className="bg-gray-800 px-4 py-2 border-b-2 border-gray-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">▶️ Preview</h3>
          <button
            onClick={() => {
              const iframe = previewRef.current
              if (iframe) {
                const doc = iframe.contentDocument || iframe.contentWindow?.document
                if (doc) {
                  const event = new Event('refresh')
                  window.dispatchEvent(event)
                }
              }
            }}
            className="text-xs px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            🔄 Refresh
          </button>
        </div>
        <iframe
          ref={previewRef}
          className="flex-1 border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Right: Files Panel */}
      <div className="w-80 bg-gray-800 border-l-2 border-gray-700 flex flex-col">
        <div className="bg-retro-blue text-black px-4 py-3 border-b-2 border-black">
          <h2 className="font-bold text-lg">📁 Files</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {selectedProject ? (
            <>
              <div className="mb-4 p-2 bg-gray-700 rounded">
                <h3 className="font-bold text-sm mb-2">{selectedProject.name}</h3>
                {selectedProject.todos.length > 0 && (
                  <div className="space-y-1">
                    {selectedProject.todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`text-xs px-2 py-1 rounded ${
                          todo.status === 'completed'
                            ? 'bg-green-600 text-white'
                            : todo.status === 'in_progress'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }`}
                      >
                        {todo.status === 'completed' && '✓ '}
                        {todo.status === 'in_progress' && '⟳ '}
                        {todo.task}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {selectedProject.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left px-3 py-2 rounded text-sm border-2 ${
                      selectedFile === file.path
                        ? 'bg-retro-yellow text-black border-retro-orange'
                        : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{file.path}</span>
                      {file.content && (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{file.description}</div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No project selected</p>
            </div>
          )}
        </div>
        {selectedProject && selectedFile && (
          <div className="border-t-2 border-gray-700 p-4 bg-gray-900 max-h-64 overflow-y-auto">
            <div className="mb-2">
              <span className="text-xs text-gray-400 font-mono">{selectedFile}</span>
            </div>
            <textarea
              value={
                selectedProject.files.find((f) => f.path === selectedFile)?.content || ''
              }
              onChange={(e) =>
                updateProjectFile(selectedProject.id, selectedFile, e.target.value)
              }
              className="w-full h-48 p-2 bg-gray-800 text-white font-mono text-xs resize-none focus:outline-none border border-gray-700 rounded"
              spellCheck={false}
              placeholder="File content..."
            />
          </div>
        )}
      </div>
    </div>
  )
}
