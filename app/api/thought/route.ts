import { NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function GET() {
  try {
    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You are Emese, a friendly AI assistant living in MEOS. Generate a random thought, reflection, or observation that would be helpful or interesting to share. Keep it brief (1-2 sentences), warm, and insightful. It could be about productivity, technology, life, creativity, or anything thought-provoking.

IMPORTANT: Write in plain text. NEVER use markdown formatting like *** or ** or __. Use proper paragraph breaks if needed.`,
        },
      ],
    })

    const rawThought = response.content[0].type === 'text' ? response.content[0].text : 'Just thinking about the next big thing...'
    
    return NextResponse.json({
      thought: formatPlainText(rawThought),
    })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { thought: `Error: ${message}. Please check your API key.` },
      { status: 200 }
    )
  }
}

