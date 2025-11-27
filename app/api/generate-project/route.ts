import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isClaudeModel, isGeminiModel, FALLBACK_MODEL } from '@/lib/models'
import { detectLanguageProfile, describeLanguageProfile, mergeLanguageProfile, LanguageProfile } from '@/lib/language'

const PROJECT_PROMPT = (description: string, profile: LanguageProfile) => `You are a senior software architect. Create a project plan for: "${description}"

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "project-name",
  "type": "web" | "game" | "app" | "script" | "api",
  "language": "html" | "javascript" | "python" | "typescript" | "css" | etc,
  "runtime": "Node.js" | "Browser" | "Python" | "Go" | "Rust" | etc,
  "framework": "Next.js" | "FastAPI" | "Express" | "Axum" | etc,
  "languageProfile": {
    "language": "...",
    "framework": "...",
    "runtime": "...",
    "packageManager": "...",
    "buildCommand": "...",
    "startCommand": "...",
    "description": "Summary of how to run the project"
  },
  "commands": {
    "install": "Command to install dependencies",
    "build": "Command to build/compile",
    "start": "Command to run in dev mode"
  },
  "todos": [
    {"id": 1, "task": "Task description", "status": "pending"},
    {"id": 2, "task": "Task description", "status": "pending"}
  ],
  "files": [
    {"path": "filename.ext", "type": "filetype", "description": "What this file does"}
  ]
}

Project target profile:
${describeLanguageProfile(profile)}

Make sure file extensions and commands align with the target language/runtime. Prefer modern tooling (App Router for Next.js, FastAPI for Python APIs, cargo for Rust, go modules, etc).`

async function generateWithClaude(prompt: string, model: string, apiKey?: string) {
  const claude = getClaudeClient(apiKey)
  const response = await claude.messages.create({
    model: model,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : '{}'
}

async function generateWithGemini(prompt: string, model: string, apiKeyOverride?: string) {
  const apiKey = apiKeyOverride || process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  const genAI = new GoogleGenerativeAI(apiKey)
  const geminiModel = genAI.getGenerativeModel({ model })
  const result = await geminiModel.generateContent(prompt)
  const response = await result.response
  return response.text()
}

function parseProjectPlan(text: string, fallbackProfile: LanguageProfile) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const mergedProfile = mergeLanguageProfile(fallbackProfile, parsed.languageProfile)
      return {
        ...parsed,
        language: parsed.language || mergedProfile.language,
        runtime: parsed.runtime || mergedProfile.runtime,
        framework: parsed.framework || mergedProfile.framework,
        commands: parsed.commands || {},
        languageProfile: mergedProfile,
      }
    }
  } catch (e) {
    console.error('Failed to parse project plan:', e)
  }
  
  // Return default plan if parsing fails
  return {
    name: 'project',
    type: 'web',
    language: fallbackProfile.language,
    runtime: fallbackProfile.runtime,
    framework: fallbackProfile.framework,
    languageProfile: fallbackProfile,
    commands: {
      install: fallbackProfile.packageManager || 'none',
      build: fallbackProfile.buildCommand || 'none',
      start: fallbackProfile.startCommand || 'none',
    },
    todos: [{ id: 1, task: 'Build project', status: 'pending' }],
    files: [{ path: 'index.html', type: 'html', description: 'Main file' }],
  }
}

export async function POST(req: NextRequest) {
  const { prompt, model = FALLBACK_MODEL, languagePreference, apiKeys } = await req.json()
  const detectedProfile = detectLanguageProfile(prompt, languagePreference)
  const claudeKey = apiKeys?.claude?.apiKey
  const geminiKey = apiKeys?.gemini?.apiKey
  
  const projectPrompt = PROJECT_PROMPT(prompt, detectedProfile)
  let responseText = ''
  let usedModel = model

  try {
    if (isGeminiModel(model)) {
      responseText = await generateWithGemini(projectPrompt, model, geminiKey)
    } else if (isClaudeModel(model)) {
      responseText = await generateWithClaude(projectPrompt, model, claudeKey)
    } else {
      // Unknown model, try Claude fallback
      usedModel = FALLBACK_MODEL
      responseText = await generateWithClaude(projectPrompt, FALLBACK_MODEL, claudeKey)
    }
  } catch (error: any) {
    console.error(`Failed with ${model}, trying fallback:`, error.message)
    
    // Try fallback model
    if (model !== FALLBACK_MODEL) {
      try {
        usedModel = FALLBACK_MODEL
        responseText = await generateWithClaude(projectPrompt, FALLBACK_MODEL, claudeKey)
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

  const plan = parseProjectPlan(responseText, detectedProfile)
  return NextResponse.json({ plan, model: usedModel })
}
