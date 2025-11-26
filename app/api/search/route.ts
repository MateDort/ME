import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { callLLMWithFallback } from '@/lib/llm-client'

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

    const prompt = `${MATE_PROFILE}\n\nI answer this search query: "${query}"\n\n${context}\n\nI provide a comprehensive answer in the style of early Google search results.

IMPORTANT: Use proper paragraph breaks (double line breaks for new paragraphs). NEVER use markdown formatting like *** or ** or __. Write naturally in plain text with proper paragraphing.`

    const llmResponse = await callLLMWithFallback(prompt, undefined, {
      maxTokens: 1000,
      temperature: 0.7,
    })

    console.log(`Search answered using: ${llmResponse.model}`)
    
    return NextResponse.json({
      response: formatPlainText(llmResponse.text),
      model: llmResponse.model,
    })
  } catch (error: any) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: `Search unavailable`, response: `Error: Could not process search. Please try again.` },
      { status: 500 }
    )
  }
}

