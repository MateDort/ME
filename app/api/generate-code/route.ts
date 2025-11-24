import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const claude = getClaudeClient()
    const { prompt, language, existingCode } = await req.json()

    const systemPrompt = `I am an expert ${language || 'JavaScript'} developer. I generate complete, working code based on my own ideas and requests. 

${MATE_PROFILE}

Instructions:
- Generate complete, runnable code
- For HTML/CSS/JS projects, create a single HTML file with embedded CSS and JavaScript
- Make the code clean, well-commented, and functional
- If the user asks for a game or interactive app, make it fully playable
- Return ONLY the code, no explanations or markdown formatting unless it's a markdown file
- For web projects, use modern HTML5, CSS3, and vanilla JavaScript (no external dependencies unless necessary)`

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: existingCode
            ? `Here's my current code:\n\n${existingCode}\n\nNow: ${prompt}`
            : prompt,
        },
      ],
    })

    const code =
      response.content[0].type === 'text'
        ? response.content[0].text
        : '// Error generating code'

    // Clean up markdown code blocks if present
    const cleanedCode = code
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/```$/gm, '')
      .trim()

    return NextResponse.json({ code: cleanedCode })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { 
        error: `Failed to generate code: ${message}`,
        code: `// Error: ${message}\n// Please check your API key in .env.local and try again.`
      },
      { status: 500 }
    )
  }
}

