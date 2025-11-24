import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const claude = getClaudeClient()
    const { filePath, fileType, projectDescription, existingFiles, todo } = await req.json()

    const context = existingFiles && existingFiles.length > 0
      ? `\n\nExisting files in project:\n${existingFiles.map((f: any) => `${f.path}: ${f.content.substring(0, 200)}...`).join('\n')}`
      : ''

    const prompt = `${MATE_PROFILE}

I'm building: ${projectDescription}

Current task: ${todo?.task || 'Generate file'}

I generate the complete code for: ${filePath} (${fileType})

Requirements:
- I make it complete and functional
- For HTML files, I include all necessary CSS and JavaScript inline if it's a single-file project
- For CSS files, I make it beautiful and modern
- For JavaScript files, I make it well-structured and commented
- I ensure all code works together
- I return ONLY the code, no markdown, no explanations${context}`

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 8000, // Increased from 4000 to handle larger files
      messages: [{ role: 'user', content: prompt }],
    })

    const code = response.content[0].type === 'text' ? response.content[0].text : ''
    
    // Clean up markdown code blocks
    const cleanedCode = code
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/```$/gm, '')
      .replace(/^```/gm, '')
      .trim()

    return NextResponse.json({ code: cleanedCode })
  } catch (error: any) {
    const { message, details } = handleClaudeError(error)
    return NextResponse.json(
      { 
        error: `Failed to generate file: ${message}`,
        details,
        code: '' 
      },
      { status: 500 }
    )
  }
}

