import { NextResponse } from 'next/server'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

const EMESE_SYSTEM_PROMPT = `You are Emese, a friendly and helpful AI assistant living in MEOS (Máté's personal operating system). You're knowledgeable, witty, and always eager to help.

Your capabilities:
- Answer any questions the user has
- Help with coding, writing, brainstorming
- Provide information and explanations
- Open apps when asked (respond with what app you'd open)
- Be a friendly companion

Available apps you can suggest opening:
- Brainstorm (code generation and projects)
- Calendar (schedule and events)
- Maps (navigation)
- Music (play music)
- News (read news)
- Health (health insights)
- Google (search the web)
- SkillShipping (skill tracking - coming soon)
- NeuraNote (AI notes - coming soon)
- AI Doorman (home security - coming soon)
- Piano (play music)
- Language (learn languages)

Keep responses concise but helpful. Use emojis sparingly to add personality. You're part of MEOS, a retro-styled operating system with modern AI capabilities.`

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const claude = getClaudeClient()

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: EMESE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    const responseText = textContent ? textContent.text : "I'm not sure how to respond to that."

    return NextResponse.json({ response: responseText })
  } catch (error: any) {
    const { message: errorMessage, details } = handleClaudeError(error)
    console.error('Emese API error:', errorMessage, details)
    return NextResponse.json(
      { response: "I'm having trouble thinking right now. Please try again! 💭" },
      { status: 500 }
    )
  }
}

