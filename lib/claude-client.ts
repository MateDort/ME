import Anthropic from '@anthropic-ai/sdk'

export function getClaudeClient(apiKeyOverride?: string) {
  const apiKey =
    apiKeyOverride || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || process.env.CLAUDE_API_KEY || ''
  
  if (!apiKey) {
    throw new Error('Claude API key not configured. Please set NEXT_PUBLIC_CLAUDE_API_KEY or CLAUDE_API_KEY in .env.local')
  }
  
  if (apiKey.length < 10) {
    throw new Error('Claude API key appears to be invalid (too short). Please check your .env.local file.')
  }
  
  return new Anthropic({ apiKey })
}

export function handleClaudeError(error: any): { message: string; details?: any } {
  console.error('Claude API error:', error)
  
  if (error?.message?.includes('apiKey') || error?.message?.includes('authentication')) {
    return {
      message: 'API key error. Please check your NEXT_PUBLIC_CLAUDE_API_KEY or CLAUDE_API_KEY in .env.local',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }
  }
  
  if (error?.error?.type === 'rate_limit_error') {
    return {
      message: 'Rate limit exceeded. Please wait a moment and try again.',
      details: error.error
    }
  }
  
  if (error?.error?.type === 'invalid_request_error') {
    return {
      message: `Invalid request: ${error.error.message || 'Please check your input'}`,
      details: error.error
    }
  }
  
  return {
    message: error?.message || error?.error?.message || 'Unknown error occurred',
    details: process.env.NODE_ENV === 'development' ? error : undefined
  }
}

