import { NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { formatPlainText } from '@/lib/format-response'
import { callLLMWithFallback } from '@/lib/llm-client'

export async function GET() {
  try {
    const prompt = `You are Emese, a friendly AI assistant living in MEOS. Generate a random thought, reflection, or observation that would be helpful or interesting to share. Keep it brief (1-2 sentences), warm, and insightful. It could be about productivity, technology, life, creativity, or anything thought-provoking.

IMPORTANT: Write in plain text. NEVER use markdown formatting like *** or ** or __. Use proper paragraph breaks if needed.`

    const llmResponse = await callLLMWithFallback(prompt, undefined, {
      maxTokens: 150,
      temperature: 0.9,
    })

    console.log(`Random thought generated using: ${llmResponse.model}`)
    
    return NextResponse.json({
      thought: formatPlainText(llmResponse.text),
      model: llmResponse.model,
    })
  } catch (error: any) {
    console.error('Thought API error:', error)
    return NextResponse.json(
      { thought: `Just thinking about the next big thing...` },
      { status: 200 }
    )
  }
}

