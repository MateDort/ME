import { getClaudeClient, handleClaudeError } from './claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface LLMResponse {
  text: string
  model: 'claude' | 'gemini'
  error?: string
}

export async function callLLMWithFallback(
  prompt: string,
  systemPrompt?: string,
  options: {
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<LLMResponse> {
  const { maxTokens = 2048, temperature = 1.0 } = options

  // Try Claude first
  try {
    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    const text = textContent ? textContent.text : "I'm not sure how to respond to that."

    return {
      text,
      model: 'claude',
    }
  } catch (claudeError: any) {
    const { message: errorMessage } = handleClaudeError(claudeError)
    console.warn('Claude API failed, falling back to Gemini:', errorMessage)

    // Fallback to Gemini
    try {
      const geminiApiKey =
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured')
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Gemini doesn't have a separate system prompt, so prepend it to the user message
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      })

      const response = await result.response
      const text = response.text()

      return {
        text,
        model: 'gemini',
      }
    } catch (geminiError: any) {
      console.error('Gemini API also failed:', geminiError)

      return {
        text: "I'm having trouble connecting to my AI models right now. Please try again later! 💭",
        model: 'gemini',
        error: geminiError.message,
      }
    }
  }
}

export async function callClaudeOrGemini(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string,
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
  } = {}
): Promise<LLMResponse> {
  const { maxTokens = 2048, temperature = 1.0, model: preferredModel } = options

  // If user specified Gemini, try Gemini first
  if (preferredModel?.includes('gemini')) {
    try {
      const geminiApiKey =
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured')
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: preferredModel })

      // Convert messages to Gemini format
      const geminiMessages = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Prepend system prompt to first user message
      if (systemPrompt && geminiMessages.length > 0) {
        geminiMessages[0].parts[0].text = `${systemPrompt}\n\n${geminiMessages[0].parts[0].text}`
      }

      const result = await model.generateContent({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      })

      const response = await result.response
      const text = response.text()

      return { text, model: 'gemini' }
    } catch (geminiError: any) {
      console.warn('Gemini failed, falling back to Claude:', geminiError.message)
      // Fall through to Claude
    }
  }

  // Try Claude (default or fallback)
  try {
    const claude = getClaudeClient()
    const response = await claude.messages.create({
      model: preferredModel || 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const textContent = response.content.find((c) => c.type === 'text')
    const text = textContent ? textContent.text : "I'm not sure how to respond to that."

    return { text, model: 'claude' }
  } catch (claudeError: any) {
    const { message: errorMessage } = handleClaudeError(claudeError)
    console.warn('Claude failed, falling back to Gemini:', errorMessage)

    // Final fallback to Gemini
    try {
      const geminiApiKey =
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

      if (!geminiApiKey) {
        throw new Error('Both Claude and Gemini API keys not configured')
      }

      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      // Convert messages to Gemini format
      const geminiMessages = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Prepend system prompt to first user message
      if (systemPrompt && geminiMessages.length > 0) {
        geminiMessages[0].parts[0].text = `${systemPrompt}\n\n${geminiMessages[0].parts[0].text}`
      }

      const result = await model.generateContent({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      })

      const response = await result.response
      const text = response.text()

      return { text, model: 'gemini' }
    } catch (geminiError: any) {
      console.error('Both Claude and Gemini failed:', geminiError)

      return {
        text: "I'm having trouble connecting to my AI models right now. Please check your API keys and try again! 💭",
        model: 'gemini',
        error: geminiError.message,
      }
    }
  }
}

