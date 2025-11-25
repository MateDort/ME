import { NextRequest, NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { isClaudeModel, isGeminiModel, FALLBACK_MODEL } from '@/lib/models'

const FILE_PROMPT = (filePath: string, fileType: string, projectDescription: string, task: string, existingFiles: string) => 
`You are a code generation assistant. Generate complete, working code.

Project: ${projectDescription}
Current task: ${task}
File to generate: ${filePath} (${fileType})
${existingFiles}

Requirements:
- Generate complete, functional code for ${filePath}
- For HTML files, include all necessary CSS and JavaScript inline if it's a single-file project
- For CSS files, use modern styling with good visual design
- For JavaScript files:
  * Write BROWSER-COMPATIBLE JavaScript only
  * Do NOT use require(), import, or Node.js modules (crypto, fs, path, etc.)
  * Do NOT use axios - use fetch() instead
  * Use vanilla JavaScript that runs in the browser
  * Forms should use event.preventDefault() to prevent page navigation
  * All functionality must work client-side in a browser
- For Python files, follow PEP 8 conventions (these won't run in browser preview)
- Ensure the code works with any other files in the project
- Return ONLY the code, no markdown code blocks, no explanations

Generate the complete ${fileType} code now:`

async function generateWithClaude(prompt: string, model: string) {
  const claude = getClaudeClient()
  const maxTokens = model.includes('haiku') ? 4096 : 8192
  const response = await claude.messages.create({
    model: model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
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

function cleanCode(code: string): string {
  return code
    .replace(/^```[\w]*\n?/gm, '')
    .replace(/```$/gm, '')
    .replace(/^```/gm, '')
    .trim()
}

export async function POST(req: NextRequest) {
  const { filePath, fileType, projectDescription, existingFiles, todo, model = FALLBACK_MODEL } = await req.json()

  const existingContext = existingFiles && existingFiles.length > 0
    ? `\n\nExisting files in project:\n${existingFiles.map((f: any) => `${f.path}:\n${f.content.substring(0, 500)}${f.content.length > 500 ? '...' : ''}`).join('\n\n')}`
    : ''

  const filePrompt = FILE_PROMPT(
    filePath,
    fileType,
    projectDescription,
    todo?.task || `Generate ${filePath}`,
    existingContext
  )

  let responseText = ''
  let usedModel = model

  try {
    if (isGeminiModel(model)) {
      responseText = await generateWithGemini(filePrompt, model)
    } else if (isClaudeModel(model)) {
      responseText = await generateWithClaude(filePrompt, model)
    } else {
      // Unknown model, try Claude fallback
      usedModel = FALLBACK_MODEL
      responseText = await generateWithClaude(filePrompt, FALLBACK_MODEL)
    }
  } catch (error: any) {
    console.error(`Failed with ${model}, trying fallback:`, error.message)
    
    // Try fallback model
    if (model !== FALLBACK_MODEL) {
      try {
        usedModel = FALLBACK_MODEL
        responseText = await generateWithClaude(filePrompt, FALLBACK_MODEL)
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
