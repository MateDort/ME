import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const claude = getClaudeClient()
    const { prompt } = await req.json()

    // Step 1: Generate project plan with todos
    const planPrompt = `${MATE_PROFILE}

I want to build: "${prompt}"

Create a detailed project plan. Return ONLY valid JSON in this exact format:
{
  "name": "project-name",
  "type": "web" | "game" | "app" | "script",
  "language": "html" | "javascript" | "python" | "typescript" | etc,
  "todos": [
    {"id": 1, "task": "Create HTML structure", "status": "pending"},
    {"id": 2, "task": "Add CSS styling", "status": "pending"},
    {"id": 3, "task": "Implement game logic", "status": "pending"}
  ],
  "files": [
    {"path": "index.html", "type": "html", "description": "Main HTML file"},
    {"path": "style.css", "type": "css", "description": "Stylesheet"},
    {"path": "script.js", "type": "javascript", "description": "Game logic"}
  ]
}`

    const planResponse = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: planPrompt }],
    })

    const planText = planResponse.content[0].type === 'text' ? planResponse.content[0].text : '{}'
    const jsonMatch = planText.match(/\{[\s\S]*\}/)
    const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      name: 'project',
      type: 'web',
      language: 'html',
      todos: [{ id: 1, task: 'Build project', status: 'pending' }],
      files: [{ path: 'index.html', type: 'html', description: 'Main file' }],
    }

    return NextResponse.json({ plan })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { error: `Failed to generate project plan: ${message}`, plan: null },
      { status: 500 }
    )
  }
}

