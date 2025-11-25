'use client'

import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MEOSFile {
  path: string
  content: string
  type: string
}

export default function BuilderApp() {
  const [files, setFiles] = useState<MEOSFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; text: string; sender: 'user' | 'agent'; timestamp: Date }>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    // Load MEOS file structure
    loadMEOSFiles()
  }, [])

  const loadMEOSFiles = async () => {
    // Load base MEOS files
    const baseFiles: MEOSFile[] = [
      { path: 'components/OSDesktop.tsx', type: 'typescript', content: '// MEOS Desktop Component\n// This is the main desktop component' },
      { path: 'components/Dock.tsx', type: 'typescript', content: '// Dock Component\n// Application dock' },
      { path: 'components/Window.tsx', type: 'typescript', content: '// Window Component\n// Window management' },
      { path: 'components/WindowManager.tsx', type: 'typescript', content: '// Window Manager\n// Manages all windows' },
      { path: 'components/apps/MessagesApp.tsx', type: 'typescript', content: '// Messages App\n// Chat application' },
      { path: 'components/apps/MusicPlayer.tsx', type: 'typescript', content: '// Music Player\n// iPod-style music player' },
      { path: 'components/apps/GoogleSearch.tsx', type: 'typescript', content: '// Google Search\n// Search application' },
      { path: 'components/apps/NewsApp.tsx', type: 'typescript', content: '// News App\n// News reader' },
      { path: 'components/apps/BrainstormApp.tsx', type: 'typescript', content: '// Brainstorm App\n// Code generation app' },
      { path: 'components/apps/HealthApp.tsx', type: 'typescript', content: '// Health App\n// Health insights' },
      { path: 'lib/store.ts', type: 'typescript', content: '// Zustand Store\n// Global state management' },
    ]

    // Load custom apps from localStorage
    const storedApps = JSON.parse(localStorage.getItem('meos_custom_apps') || '[]')
    const customFiles: MEOSFile[] = storedApps.map((app: any) => ({
      path: `components/apps/${app.name}App.tsx`,
      type: 'typescript',
      content: app.code || '// Custom app component',
    }))

    setFiles([...baseFiles, ...customFiles])
    if (baseFiles.length > 0) {
      setSelectedFile(baseFiles[0].path)
      setEditedContent(baseFiles[0].content)
    }
  }

  useEffect(() => {
    if (selectedFile) {
      const file = files.find(f => f.path === selectedFile)
      if (file) {
        setEditedContent(file.content)
      }
    }
  }, [selectedFile, files])

  const handleSaveFile = () => {
    if (!selectedFile) return
    
    const updatedFiles = files.map(f => 
      f.path === selectedFile ? { ...f, content: editedContent } : f
    )
    setFiles(updatedFiles)
    
    // Save to localStorage
    const customApps = updatedFiles
      .filter(f => f.path.startsWith('components/apps/') && !f.path.includes('MessagesApp') && !f.path.includes('MusicPlayer') && !f.path.includes('GoogleSearch') && !f.path.includes('NewsApp') && !f.path.includes('BrainstormApp') && !f.path.includes('HealthApp') && !f.path.includes('BuilderApp') && !f.path.includes('AppLauncher') && !f.path.includes('LanguageApp') && !f.path.includes('PianoApp'))
      .map(f => ({
        name: f.path.replace('components/apps/', '').replace('App.tsx', ''),
        code: f.content,
      }))
    localStorage.setItem('meos_custom_apps', JSON.stringify(customApps))
    
    setIsEditing(false)
    alert('File saved! (Note: Changes are saved to localStorage. To persist, you\'ll need to manually update the actual files.)')
  }

  const handleCreateNewApp = async () => {
    const appName = prompt('Enter app name (e.g., "Calculator"):')
    if (!appName) return
    
    const newFile: MEOSFile = {
      path: `components/apps/${appName}App.tsx`,
      type: 'typescript',
      content: `'use client'

import { useState } from 'react'

export default function ${appName}App() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">${appName}</h1>
        <p className="text-gray-400">Your new app component</p>
      </div>
    </div>
  )
}
`,
    }
    
    setFiles([...files, newFile])
    setSelectedFile(newFile.path)
    setEditedContent(newFile.content)
    setIsEditing(true)
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || isGenerating) return

    const userMessage = {
      id: `user-${Date.now()}`,
      text: chatInput,
      sender: 'user' as const,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])
    const inputText = chatInput
    setChatInput('')
    setIsGenerating(true)

    try {
      // Check if user wants to create a new app
      const isNewApp = inputText.toLowerCase().includes('build') || 
                      inputText.toLowerCase().includes('create') ||
                      inputText.toLowerCase().includes('make') ||
                      inputText.toLowerCase().includes('new app')

      if (isNewApp && !selectedFile) {
        // Generate a new app component
        const response = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `Create a new MEOS app component. ${inputText}. This should be a complete React component that can be used in MEOS. Make it fun, interactive, and styled in a 1970s-2000s retro theme. The component should be a functional React component with TypeScript. Include all necessary imports and make it self-contained.`,
            language: 'typescript',
            existingCode: '',
          }),
        })

        const data = await response.json()
        
        if (data.code) {
          // Extract app name from prompt
          const appNameMatch = inputText.match(/(?:build|create|make|new app).*?(?:called|named|with|for)\s+([a-z]+)/i) || 
                              inputText.match(/(?:arcade|game|app|tool)\s+([a-z]+)/i)
          const appName = appNameMatch ? appNameMatch[1].toLowerCase() : `app-${Date.now()}`
          
          // Create new file entry
          const newFile: MEOSFile = {
            path: `components/apps/${appName}App.tsx`,
            type: 'typescript',
            content: data.code,
          }
          
          setFiles((prev) => [...prev, newFile])
          setSelectedFile(newFile.path)
          
          // Store in localStorage for persistence
          const storedApps = JSON.parse(localStorage.getItem('meos_custom_apps') || '[]')
          storedApps.push({
            id: appName,
            name: appName,
            component: appName,
            code: data.code,
            createdAt: new Date().toISOString(),
          })
          localStorage.setItem('meos_custom_apps', JSON.stringify(storedApps))
          
          const agentMessage = {
            id: `agent-${Date.now()}`,
            text: `✅ Created new app: ${appName}App.tsx\n\n${data.code.substring(0, 200)}...\n\nApp has been saved and can be used in MEOS!`,
            sender: 'agent' as const,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, agentMessage])
        } else {
          throw new Error(data.error || 'Failed to generate app')
        }
      } else {
        // Edit existing file
        const response = await fetch('/api/generate-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `I want to edit MEOS (My Operating System). ${inputText}. The current file I'm working on is: ${selectedFile || 'none'}. Generate the code changes needed.`,
            language: selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.ts') ? 'typescript' : 'javascript',
            existingCode: selectedFile ? files.find((f) => f.path === selectedFile)?.content || '' : '',
          }),
        })

        const data = await response.json()
        const agentMessage = {
          id: `agent-${Date.now()}`,
          text: data.code || 'Generated code will appear here',
          sender: 'agent' as const,
          timestamp: new Date(),
        }
        setChatMessages((prev) => [...prev, agentMessage])

        // Update the selected file with generated code
        if (selectedFile && data.code) {
          setFiles((prev) =>
            prev.map((f) =>
              f.path === selectedFile ? { ...f, content: data.code } : f
            )
          )
          setEditedContent(data.code)
          setIsEditing(true)
        }
      }
    } catch (error: any) {
      console.error('Error generating code:', error)
      const errorMessage = {
        id: `error-${Date.now()}`,
        text: `Error: ${error.message || 'Failed to generate code. Please try again.'}`,
        sender: 'agent' as const,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedFileContent = files.find((f) => f.path === selectedFile)?.content || ''

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* File Tree */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">MEOS Files</h2>
          <p className="text-xs text-gray-400 mt-1">Edit MEOS components</p>
        </div>
        <div className="p-2">
          {files.map((file) => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file.path)}
              className={`w-full text-left p-2 rounded mb-1 text-sm ${
                selectedFile === file.path
                  ? 'bg-retro-blue text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="truncate">{file.path}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <div className="h-full flex flex-col">
              <div className="bg-gray-800 p-2 border-b border-gray-700 flex items-center justify-between">
                <span className="text-sm text-gray-400">{selectedFile}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    {isEditing ? '📖 View' : '✏️ Edit'}
                  </button>
                  {isEditing && (
                    <button
                      onClick={handleSaveFile}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-bold"
                    >
                      💾 Save
                    </button>
                  )}
                  <button
                    onClick={handleCreateNewApp}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold"
                  >
                    ➕ New App
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full p-4 bg-gray-900 text-white font-mono text-sm resize-none focus:outline-none"
                    style={{ fontFamily: 'monospace', tabSize: 2 }}
                  />
                ) : (
                  <SyntaxHighlighter
                    language={files.find((f) => f.path === selectedFile)?.type || 'typescript'}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, height: '100%', background: '#1e1e1e' }}
                  >
                    {selectedFileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🔧</div>
                <p className="text-xl">Select a file to edit</p>
                <p className="text-sm mt-2">This is the Builder - edit MEOS itself!</p>
                <button
                  onClick={handleCreateNewApp}
                  className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold"
                >
                  ➕ Create New App
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold">AI Assistant</h2>
          <p className="text-xs text-gray-400 mt-1">Ask me to edit MEOS</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded ${
                msg.sender === 'user'
                  ? 'bg-retro-blue ml-8'
                  : 'bg-gray-700 mr-8'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
              <div className="text-xs text-gray-400 mt-1">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="p-3 rounded bg-gray-700 mr-8">
              <div className="text-sm">Generating code...</div>
            </div>
          )}
        </div>
        <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-700">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask me to edit MEOS..."
            className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-retro-blue"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={isGenerating || !chatInput.trim()}
            className="mt-2 w-full bg-retro-blue hover:bg-retro-green text-white p-2 rounded disabled:opacity-50"
          >
            Generate
          </button>
        </form>
      </div>
    </div>
  )
}

