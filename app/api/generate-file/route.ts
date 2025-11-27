import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isClaudeModel, isGeminiModel, FALLBACK_MODEL } from '@/lib/models'
import { LanguageProfile, mergeLanguageProfile, DEFAULT_LANGUAGE_PROFILE, describeLanguageProfile } from '@/lib/language'

const FILE_PROMPT = (
  filePath: string,
  fileType: string,
  projectDescription: string,
  task: string,
  existingFiles: string,
  languageContext: string,
  fileGuidance: string
) => `You are a code generation assistant. Generate complete, working code.

Project: ${projectDescription}
Current task: ${task}
File to generate: ${filePath} (${fileType})
${existingFiles}

Project target:
${languageContext}

File-specific guidance:
${fileGuidance}

Requirements:
- Generate complete, functional code for ${filePath}
- Follow language-specific conventions (PEP8, gofmt, cargo fmt, Prettier, etc.)
- Make sure imports/modules align with ${languageContext.split('\n')[0]}
- Do NOT wrap the output in markdown code blocks
- Return ONLY the code, no explanations

Generate the complete ${fileType} code now:`

function buildFileGuidance(filePath: string, fileType: string, profile: LanguageProfile): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || fileType.toLowerCase()
  switch (ext) {
    case 'py':
      return 'Follow PEP8, include type hints where useful, and ensure the file integrates with FastAPI/Flask style routers.'
    case 'go':
      return 'Use go modules, proper package names, and ensure the file compiles with gofmt formatting.'
    case 'rs':
      return 'Use idiomatic Rust with cargo structure. Include necessary use statements and ensure the module compiles.'
    case 'ts':
    case 'tsx':
      if (profile.framework?.toLowerCase().includes('next.js')) {
        return 'Use the Next.js App Router conventions (server/client components). Default export React components and avoid browser-only APIs in server files.'
      }
      return 'Use TypeScript strict mode with ES modules and include appropriate props/interfaces.'
    case 'js':
      if (profile.runtime?.toLowerCase().includes('browser')) {
        return 'Use browser-compatible JS. Avoid require() and Node-specific modules.'
      }
      return 'Target Node.js 18+ with ESM syntax. Prefer async/await and fetch over axios.'
    case 'html':
      return 'Include <!DOCTYPE html>. Ensure the document can render standalone with inline CSS/JS if needed.'
    case 'css':
      return 'Use modern CSS (flexbox/grid). Scope class names to avoid collisions.'
    case 'md':
      return 'Write helpful documentation with setup, scripts, and usage instructions.'
    case 'swift':
      return 'Use Swift 5.9+. If this is SwiftUI, ensure structs conform to View.'
    case 'kt':
      return 'Use idiomatic Kotlin with coroutines and Jetpack components for Android.'
    case 'cs':
      return 'Target .NET 8. Include namespaces, async Task methods, and dependency injection patterns where relevant.'
    default:
      return `Follow best practices for ${profile.language}. Ensure the file integrates with the described runtime/framework.`
  }
}

async function generateWithClaude(prompt: string, model: string, apiKey?: string) {
  const claude = getClaudeClient(apiKey)
  const maxTokens = model.includes('haiku') ? 4096 : 8192
  const response = await claude.messages.create({
    model: model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
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

function cleanCode(code: string): string {
  return code
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/```$/gm, '')
    .replace(/^```/gm, '')
    .trim()
}

export async function POST(req: NextRequest) {
  const {
    filePath,
    fileType,
    projectDescription,
    existingFiles,
    todo,
    model = FALLBACK_MODEL,
    languageProfile,
    apiKeys,
  } = await req.json()

  const mergedProfile = mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, languageProfile)
  const claudeKey = apiKeys?.claude?.apiKey
  const geminiKey = apiKeys?.gemini?.apiKey

  const existingContext = existingFiles && existingFiles.length > 0
    ? `\n\nExisting files in project:\n${existingFiles.map((f: any) => `${f.path}:\n${f.content.substring(0, 500)}${f.content.length > 500 ? '...' : ''}`).join('\n\n')}`
    : ''
  const languageContext = describeLanguageProfile(mergedProfile)
  const fileGuidance = buildFileGuidance(filePath, fileType, mergedProfile)

  const filePrompt = FILE_PROMPT(
    filePath,
    fileType,
    projectDescription,
    todo?.task || `Generate ${filePath}`,
    existingContext,
    languageContext,
    fileGuidance
  )

  let responseText = ''
  let usedModel = model

  try {
    if (isGeminiModel(model)) {
      responseText = await generateWithGemini(filePrompt, model, geminiKey)
    } else if (isClaudeModel(model)) {
      responseText = await generateWithClaude(filePrompt, model, claudeKey)
    } else {
      // Unknown model, try Claude fallback
      usedModel = FALLBACK_MODEL
      responseText = await generateWithClaude(filePrompt, FALLBACK_MODEL, claudeKey)
    }
  } catch (error: any) {
    console.error(`Failed with ${model}, trying fallback:`, error.message)
    
    // Try fallback model
    if (model !== FALLBACK_MODEL) {
      try {
        usedModel = FALLBACK_MODEL
        responseText = await generateWithClaude(filePrompt, FALLBACK_MODEL, claudeKey)
      } catch (fallbackError: any) {
        const { message, details } = handleClaudeError(fallbackError)
        return NextResponse.json(
          { 
            error: `Failed to generate file: ${message}`,
            details,
            code: `// Error generating ${filePath}: ${message}` 
          },
          { status: 500 }
        )
      }
    } else {
      const { message, details } = handleClaudeError(error)
      return NextResponse.json(
        { 
          error: `Failed to generate file: ${message}`,
          details,
          code: `// Error generating ${filePath}: ${message}` 
        },
        { status: 500 }
      )
    }
  }

  const cleanedCode = cleanCode(responseText)
  return NextResponse.json({ code: cleanedCode, model: usedModel })
}
