import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isClaudeModel, isGeminiModel, FALLBACK_MODEL } from '@/lib/models'

const PROJECT_PROMPT = (description: string) => `You are a code generation assistant. Create a project plan for: "${description}"

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "project-name",
  "type": "web" | "game" | "app" | "script" | "api",
  "language": "html" | "javascript" | "python" | "typescript" | "css" | etc,
  "todos": [
    {"id": 1, "task": "Task description", "status": "pending"},
    {"id": 2, "task": "Task description", "status": "pending"}
  ],
  "files": [
    {"path": "filename.ext", "type": "filetype", "description": "What this file does"}
  ]
}

Choose appropriate files based on the project type. For web projects use html/css/js. For Python scripts use .py files. For Node.js use .js or .ts files.`

async function generateWithClaude(prompt: string, model: string) {
  const claude = getClaudeClient()
  const response = await claude.messages.create({
    model: model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : '{}'
}

async function generateWithGemini(prompt: string, model: string) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({ model })
  const result = await geminiModel.generateContent(prompt)
  const response = await result.response
  return response.text()
}

function parseProjectPlan(text: string) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse project plan:', e)
  }
  
  // Return default plan if parsing fails
  return {
    name: 'project',
    type: 'web',
    language: 'html',
    todos: [{ id: 1, task: 'Build project', status: 'pending' }],
    files: [{ path: 'index.html', type: 'html', description: 'Main file' }],
  }
}

export async function POST(req: NextRequest) {
  const { prompt, model = FALLBACK_MODEL } = await req.json()
  
  const projectPrompt = PROJECT_PROMPT(prompt)
  let responseText = ''
  let usedModel = model

  try {
    if (isGeminiModel(model)) {
      responseText = await generateWithGemini(projectPrompt, model)
    } else if (isClaudeModel(model)) {
      responseText = await generateWithClaude(projectPrompt, model)
    } else {
      // Unknown model, try Claude fallback
      usedModel = FALLBACK_MODEL
      responseText = await generateWithClaude(projectPrompt, FALLBACK_MODEL)
    }
  } catch (error: any) {
    console.error(`Failed with ${model}, trying fallback:`, error.message)
    
    // Try fallback model
    if (model !== FALLBACK_MODEL) {
      try {
        usedModel = FALLBACK_MODEL
        responseText = await generateWithClaude(projectPrompt, FALLBACK_MODEL)
      } catch (fallbackError: any) {
        const { message } = handleClaudeError(fallbackError)
        return NextResponse.json(
          { error: `Failed to generate project plan: ${message}`, plan: null },
          { status: 500 }
        )
      }
    } else {
      const { message } = handleClaudeError(error)
      return NextResponse.json(
        { error: `Failed to generate project plan: ${message}`, plan: null },
        { status: 500 }
      )
    }
  }

  const plan = parseProjectPlan(responseText)
  return NextResponse.json({ plan, model: usedModel })
}
