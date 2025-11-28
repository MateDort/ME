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
  'gemini-3-pro-preview', // Gemini 3 Pro - Most intelligent, multimodal understanding (Preview, Nov 2025)
  'gemini-2.5-pro', // Gemini 2.5 Pro - State-of-the-art thinking model (Stable, Jun 2025)
  'gemini-2.5-flash', // Gemini 2.5 Flash - Best price-performance, fast (Stable, Jun 2025)
  'gemini-2.5-flash-lite', // Gemini 2.5 Flash-Lite - Ultra fast, cost-efficient (Stable, Jul 2025)
  'gemini-2.0-flash', // Gemini 2.0 Flash - Second generation workhorse, 1M token context (Latest, Feb 2025)
  'gemini-2.0-flash-001', // Gemini 2.0 Flash - Stable version
  'gemini-1.5-pro', // Gemini 1.5 Pro - Previous generation (Legacy)
  'gemini-1.5-flash', // Gemini 1.5 Flash - Previous generation (Legacy)
]

export const GPT_MODELS = [
  'gpt-5.1', // GPT-5.1 - Best for coding and agentic tasks (latest)
  'gpt-5-mini', // GPT-5 mini - Faster, cost-efficient
  'gpt-5-nano', // GPT-5 nano - Fastest, most cost-efficient
  'gpt-5-pro', // GPT-5 pro - Smarter and more precise
  'gpt-5', // GPT-5 - Previous intelligent reasoning model
  'gpt-5.1-codex', // GPT-5.1 Codex - Optimized for agentic coding
  'gpt-5-codex', // GPT-5 Codex - Optimized for agentic coding
  'gpt-4.1', // GPT-4.1 - Smartest non-reasoning model
  'gpt-4.1-mini', // GPT-4.1 mini - Smaller, faster version
  'gpt-4.1-nano', // GPT-4.1 nano - Fastest, most cost-efficient
  'gpt-4o', // GPT-4o - Fast, intelligent, flexible
  'gpt-4o-mini', // GPT-4o mini - Fast, affordable small model
  'gpt-4-turbo', // GPT-4 Turbo - Older high-intelligence model
  'gpt-4', // GPT-4 - Older high-intelligence model
  'gpt-3.5-turbo', // GPT-3.5 Turbo - Legacy model for cheaper tasks
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

// Check if model is GPT
export const isGPTModel = (model: string) => GPT_MODELS.includes(model)
