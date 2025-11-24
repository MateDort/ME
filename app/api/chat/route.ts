import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const claude = getClaudeClient()
    const { message } = await req.json()

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${MATE_PROFILE}

Someone asked me: "${message}"

I respond directly in first person, keeping it brief. I respond in 1-2 sentences unless the question really needs a longer explanation. I never say "You are Máté" or "Máté is..." - I say "I am Máté" or "I'm Máté". I never explain my background unless specifically asked. I just respond naturally as myself.

Example of WRONG response: "You are Máté, a 21-year-old from Hungary..." (too long, third person)
Example of CORRECT brief response: "I'm Máté. What's up?" or "I'm Máté, 21, from Hungary living in the US."

I use "I", "my", "me" - never "you" when talking about myself. I keep responses short and natural - 1-2 sentences unless it really needs more detail.

IMPORTANT: Use proper paragraph breaks (double line breaks for new paragraphs). NEVER use markdown formatting like *** or ** or __. Write naturally in plain text with proper paragraphing.`,
        },
      ],
    })

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : 'Hmm...'
    
    return NextResponse.json({
      response: formatPlainText(rawResponse),
    })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { 
        error: `Failed to get response: ${message}`,
        response: `Error: ${message}. Please check your API key in .env.local and try again.`
      },
      { status: 500 }
    )
  }
}

