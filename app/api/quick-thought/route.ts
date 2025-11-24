import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

export async function POST(req: NextRequest) {
  try {
    const claude = getClaudeClient()
    const { thought } = await req.json()

    const prompt = `${MATE_PROFILE}

I just had this thought: "${thought}"

I respond naturally and authentically as myself. I keep it concise but meaningful. 

IMPORTANT FORMATTING RULES:
- Use proper paragraph breaks (double line breaks for new paragraphs)
- NEVER use markdown formatting like *** or ** or __
- Use plain text only
- If you want to emphasize something, just write it naturally - the system will handle formatting
- Write in a conversational, natural way

Also, I determine if any actions should be taken based on my thought. Return my response as JSON:
{
  "response": "My natural response here with proper paragraphing",
  "actions": [
    {"type": "music", "data": {}} // if my thought is about music
    // or {"type": "video", "data": {}} // if I want to watch something
    // or {"type": "search", "data": {"query": "..."}} // if I want to search
    // or {"type": "message", "data": {}} // if I want to chat
    // or {"type": "note", "data": {}} // if I want to brainstorm
  ]
}

Examples:
- "I want to listen to music" → action: music
- "Show me F1 news" → action: search with query "F1 news"
- "I have an idea" → action: note (brainstorm)
- "I'm feeling creative" → action: note
- "What's happening in tech?" → action: search with query "tech news"

I only include actions if they make sense. If it's just a thought/reflection, I return empty actions array.`

    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

    // Parse JSON response
    let result
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        result = { response: text, actions: [] }
      }
    } catch (e) {
      result = { response: text, actions: [] }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { response: `Error: ${message}. Please check your API key.`, actions: [] },
      { status: 200 }
    )
  }
}

