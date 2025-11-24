import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'

const SERPER_API_KEY = process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.SERPER_API_KEY

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    // Get search results from Serper
    let searchResults = null
    try {
      const serperResponse = await axios.post(
        'https://google.serper.dev/search',
        {
          q: query,
          num: 10,
        },
        {
          headers: {
            'X-API-KEY': SERPER_API_KEY || '',
            'Content-Type': 'application/json',
          },
        }
      )
      searchResults = serperResponse.data
    } catch (error) {
      console.error('Serper API error:', error)
    }

    const context = searchResults
      ? `Search results: ${JSON.stringify(searchResults.organic?.slice(0, 5) || [])}`
      : ''

    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${MATE_PROFILE}\n\nI answer this search query: "${query}"\n\n${context}\n\nI provide a comprehensive answer in the style of early Google search results.

IMPORTANT: Use proper paragraph breaks (double line breaks for new paragraphs). NEVER use markdown formatting like *** or ** or __. Write naturally in plain text with proper paragraphing.`,
        },
      ],
    })

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : 'No results found.'
    
    return NextResponse.json({
      response: formatPlainText(rawResponse),
    })
  } catch (error: any) {
    const { message } = handleClaudeError(error)
    return NextResponse.json(
      { error: `Search unavailable: ${message}`, response: `Error: ${message}. Please check your API key.` },
      { status: 500 }
    )
  }
}

