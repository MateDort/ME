import { NextResponse } from 'next/server'

export async function GET() {
  // This route helps debug environment variable loading
  const hasClaudeKey = !!(
    process.env.NEXT_PUBLIC_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY
  )
  const hasSerperKey = !!(
    process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.SERPER_API_KEY
  )

  return NextResponse.json({
    hasClaudeKey,
    hasSerperKey,
    claudeKeyLength: (
      process.env.NEXT_PUBLIC_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY || ''
    ).length,
    serperKeyLength: (
      process.env.NEXT_PUBLIC_SERPER_API_KEY || process.env.SERPER_API_KEY || ''
    ).length,
  })
}

