import { NextRequest, NextResponse } from 'next/server'
import { MATE_PROFILE } from '@/lib/mate-profile'
import { getClaudeClient, handleClaudeError } from '@/lib/claude-client'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { CLAUDE_MODELS, GEMINI_MODELS } from '@/lib/models'
import { describeLanguageProfile, mergeLanguageProfile, DEFAULT_LANGUAGE_PROFILE } from '@/lib/language'

export async function POST(req: NextRequest) {
  try {
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('Generate API: Failed to parse request body', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      prompt,
      model,
      mode,
      image,
      existingFiles,
      projectDescription,
      filePath,
      fileType,
      todo,
      languageProfile,
      apiKeys,
    } = body

    if (!model) {
      console.error('Generate API: Model is missing')
      return NextResponse.json({ error: 'Model is required' }, { status: 400 })
    }

    // Normalize model name to handle old formats and aliases
    let normalizedModel = model
    // Handle old format: claude-opus-4.5-20251124 -> claude-opus-4-5-20251101
    if (model === 'claude-opus-4.5-20251124' || model === 'claude-opus-4-5-20251124') {
      normalizedModel = 'claude-opus-4-5-20251101'
    } else if (model === 'claude-sonnet-4.5-20250929' || model === 'claude-sonnet-4-5-20250929') {
      normalizedModel = 'claude-sonnet-4-5-20250929'
    } else if (model === 'claude-haiku-4.5-20251001' || model === 'claude-haiku-4-5-20251001') {
      normalizedModel = 'claude-haiku-4-5-20251001'
    }

    const isClaude = CLAUDE_MODELS.includes(normalizedModel)
    const isGemini = GEMINI_MODELS.includes(normalizedModel)

    if (!isClaude && !isGemini) {
      console.error('Generate API: Invalid model', { 
        originalModel: model,
        normalizedModel,
        availableClaude: CLAUDE_MODELS,
        availableGemini: GEMINI_MODELS 
      })
      return NextResponse.json({ 
        error: `Invalid model selected: ${model}. Available models: ${[...CLAUDE_MODELS, ...GEMINI_MODELS].join(', ')}` 
      }, { status: 400 })
    }

    // Use normalized model for the rest of the function
    const finalModel = normalizedModel

    // Build context
    const context = existingFiles && existingFiles.length > 0
      ? `\n\nExisting files in project:\n${existingFiles.map((f: any) => `${f.path}: ${f.content.substring(0, 200)}...`).join('\n')}`
      : ''

    const taskContext = todo ? `\n\nCurrent task: ${todo.task}` : ''
    const fileContext = filePath ? `\n\nGenerating file: ${filePath} (${fileType})` : ''
    const mergedProfile = mergeLanguageProfile(DEFAULT_LANGUAGE_PROFILE, languageProfile)
    const languageContext = describeLanguageProfile(mergedProfile)

    if (isClaude) {
      const claude = getClaudeClient(apiKeys?.claude?.apiKey)
      
      let systemPrompt = ''
      if (mode === 'agent') {
        systemPrompt = `${MATE_PROFILE}

I am building: ${projectDescription || 'a project'}
${taskContext}${fileContext}
Project target:
${languageContext}

I generate complete, working code.
- For HTML files, include all necessary CSS and JavaScript inline if it's a single-file project
- For JavaScript: Use BROWSER-COMPATIBLE code only. NO require(), NO Node.js modules, NO axios. Use fetch() and vanilla JS
- Forms must use event.preventDefault() to prevent page navigation
- All code must run client-side in a browser
- Return ONLY the code, no markdown, no explanations${context}`
      } else {
        systemPrompt = `${MATE_PROFILE}

Project target:
${languageContext}

I answer questions about code and projects. I provide helpful explanations and guidance.${context}`
      }

      const messages: any[] = []
      
      // Handle image if provided
      if (image && mode === 'agent') {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: image.mimeType || 'image/png',
                data: image.data,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        })
      } else {
        messages.push({
          role: 'user',
          content: prompt,
        })
      }

      // Set appropriate token limits based on model
      // Claude 4.5 models: 64K max output (actually 64000, not 65536), 200K context (1M beta for Sonnet)
      let maxTokens = 4096
      if (finalModel.includes('4-5') || finalModel.includes('4.5')) {
        maxTokens = 64000 // Claude 4.5 models support 64K tokens (64000 max)
      } else if (finalModel.includes('4-1')) {
        maxTokens = 32768 // Claude Opus 4.1 supports 32K tokens
      } else if (finalModel.includes('opus')) {
        maxTokens = 4096 // Claude 3 Opus has 4096 max
      } else if (finalModel.includes('sonnet') || finalModel.includes('3-5')) {
        maxTokens = 8192 // Sonnet and 3.5 models support 8192
      } else if (finalModel.includes('haiku')) {
        maxTokens = 4096 // Haiku has 4096 max
      }

      const response = await claude.messages.create({
        model: finalModel,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Clean up markdown code blocks
      const cleanedText = text
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/^```/gm, '')
        .trim()

      return NextResponse.json({ 
        response: cleanedText,
        model: finalModel,
      })
    } else if (isGemini) {
      const apiKey = apiKeys?.gemini?.apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
      }

      // Normalize Gemini model names (handle -latest suffix and 3.0 variants)
      let geminiNormalized = finalModel
      if (finalModel === 'gemini-3.0-pro') {
        geminiNormalized = 'gemini-3.0-pro' // Use as-is if API supports it
      } else if (finalModel === 'gemini-3.0-flash') {
        geminiNormalized = 'gemini-3.0-flash' // Use as-is if API supports it
      } else if (finalModel === 'gemini-1.5-pro-latest') {
        geminiNormalized = 'gemini-1.5-pro'
      } else if (finalModel === 'gemini-1.5-flash-latest') {
        geminiNormalized = 'gemini-1.5-flash'
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const geminiModel = genAI.getGenerativeModel({ model: geminiNormalized })

      let fullPrompt = prompt
      if (mode === 'agent') {
        fullPrompt = `You are a code generation assistant.

I am building: ${projectDescription || 'a project'}
${taskContext}${fileContext}
Project target:
${languageContext}

I generate complete, working code.
- For HTML files, include all necessary CSS and JavaScript inline if it's a single-file project
- For JavaScript: Use BROWSER-COMPATIBLE code only. NO require(), NO Node.js modules, NO axios. Use fetch() and vanilla JS
- Forms must use event.preventDefault() to prevent page navigation
- All code must run client-side in a browser
- Return ONLY the code, no markdown, no explanations${context}

User request: ${prompt}`
      } else {
        fullPrompt = `You are a helpful coding assistant.

Project target:
${languageContext}

I answer questions about code and projects. I provide helpful explanations and guidance.${context}

Question: ${prompt}`
      }

      // Handle image if provided
      if (image && finalModel.includes('vision')) {
        const imagePart = {
          inlineData: {
            data: image.data,
            mimeType: image.mimeType || 'image/png',
          },
        }
        const result = await geminiModel.generateContent([fullPrompt, imagePart])
        const response = await result.response
        const text = response.text()
        return NextResponse.json({ 
          response: text,
          model: finalModel,
        })
      } else {
        const result = await geminiModel.generateContent(fullPrompt)
        const response = await result.response
        const text = response.text()
        
        // Clean up markdown code blocks
        const cleanedText = text
          .replace(/^```[\w]*\n?/gm, '')
          .replace(/```$/gm, '')
          .replace(/^```/gm, '')
          .trim()
        
        return NextResponse.json({ 
          response: cleanedText,
          model: finalModel,
        })
      }
    }

    return NextResponse.json({ error: 'Unsupported model' }, { status: 400 })
  } catch (error: any) {
    console.error('Generate with model error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate response',
        response: '',
      },
      { status: 500 }
    )
  }
}

