import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY || ''
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key not found',
        details: {
          hasNextPublic: !!process.env.NEXT_PUBLIC_CLAUDE_API_KEY,
          hasRegular: !!process.env.CLAUDE_API_KEY,
          keyLength: apiKey.length,
        }
      }, { status: 500 })
    }

    const claude = new Anthropic({ apiKey })

    // Test with a simple request
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "Hello" if you can read this.' }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : 'No text response'

    return NextResponse.json({
      success: true,
      message: 'LLM API is working!',
      response: text,
      model: 'claude-3-haiku-20240307',
      apiKeyConfigured: true,
      apiKeyLength: apiKey.length,
    })
  } catch (error: any) {
    console.error('LLM test error:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      details: error?.error || error,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    }, { status: 500 })
  }
}

