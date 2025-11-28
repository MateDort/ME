// Available AI models

export const CLAUDE_MODELS = [
  'claude-opus-4-5-20251101', // Claude Opus 4.5 - Latest, most capable (Nov 2025)
  'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5 - Latest, elite coding (Sep 2025)
  'claude-haiku-4-5-20251001', // Claude Haiku 4.5 - Latest, fastest (Oct 2025)
  'claude-opus-4-1-20250805', // Claude Opus 4.1 - Exceptional reasoning (Aug 2025)
  'claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet - Best for coding
  'claude-3-5-haiku-20241022', // Claude 3.5 Haiku - Fast and cheap
  'claude-3-opus-20240229', // Claude 3 Opus - Most capable
  'claude-3-sonnet-20240229', // Claude 3 Sonnet - Balanced
  'claude-3-haiku-20240307', // Claude 3 Haiku - Fastest
]

export const GEMINI_MODELS = [
  'gemini-3.0-pro', // Gemini 3.0 Pro - Latest, most advanced (Nov 2025)
  'gemini-3.0-flash', // Gemini 3.0 Flash - Latest, fast (Nov 2025)
  'gemini-1.5-pro-latest', // Gemini 1.5 Pro - Most capable
  'gemini-1.5-flash-latest', // Gemini 1.5 Flash - Fast and capable
  'gemini-1.5-pro', // Gemini 1.5 Pro - Stable
  'gemini-1.5-flash', // Gemini 1.5 Flash - Stable
  'gemini-pro', // Gemini Pro - Legacy
]

// Default models - using latest best models
export const DEFAULT_AGENT_MODEL = 'claude-opus-4-5-20251101' // Latest, most capable
export const DEFAULT_ASK_MODEL = 'claude-sonnet-4-5-20250929' // Latest, fast and capable

// Fallback model if selected model fails
export const FALLBACK_MODEL = 'claude-3-5-haiku-20241022'

// Check if model is Claude
export const isClaudeModel = (model: string) => CLAUDE_MODELS.includes(model)

// Check if model is Gemini
export const isGeminiModel = (model: string) => GEMINI_MODELS.includes(model)
