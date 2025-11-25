// Available AI models

export const CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet - Best for coding
  'claude-3-5-haiku-20241022', // Claude 3.5 Haiku - Fast and cheap
  'claude-3-opus-20240229', // Claude 3 Opus - Most capable
  'claude-3-haiku-20240307', // Claude 3 Haiku - CONFIRMED WORKING (fallback)
]

export const GEMINI_MODELS = [
  'gemini-1.5-flash', // Gemini 1.5 Flash - Fast and capable
  'gemini-1.5-pro', // Gemini 1.5 Pro - Most capable
  'gemini-pro', // Gemini Pro - Standard
]

// Default models
export const DEFAULT_AGENT_MODEL = 'claude-3-haiku-20240307' // Confirmed working, good balance
export const DEFAULT_ASK_MODEL = 'claude-3-haiku-20240307' // Fast for Q&A (confirmed working)

// Fallback model if selected model fails
export const FALLBACK_MODEL = 'claude-3-haiku-20240307'

// Check if model is Claude
export const isClaudeModel = (model: string) => CLAUDE_MODELS.includes(model)

// Check if model is Gemini
export const isGeminiModel = (model: string) => GEMINI_MODELS.includes(model)
